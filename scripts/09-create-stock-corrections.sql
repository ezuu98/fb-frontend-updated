-- Create stock_corrections table for tracking uploaded actual stock counts per warehouse
CREATE TABLE IF NOT EXISTS stock_corrections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id INTEGER NOT NULL, -- Matches inventory.odoo_id (INTEGER)
  warehouse_id UUID NOT NULL, -- Matches warehouse UUID (UUID)
  barcode VARCHAR(50) NOT NULL,
  correction_date DATE NOT NULL,
  corrected_stock INTEGER NOT NULL CHECK (corrected_stock >= 0), -- Prevent negative stock
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES profiles(id),
  notes TEXT,
  
  -- Ensure one correction per product per warehouse per date
  UNIQUE(product_id, warehouse_id, correction_date)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_stock_corrections_product_warehouse_date 
ON stock_corrections(product_id, warehouse_id, correction_date);

CREATE INDEX IF NOT EXISTS idx_stock_corrections_barcode 
ON stock_corrections(barcode);

CREATE INDEX IF NOT EXISTS idx_stock_corrections_date 
ON stock_corrections(correction_date);

-- Add RLS policy for stock_corrections
ALTER TABLE stock_corrections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all stock corrections
CREATE POLICY "Users can view stock corrections" 
ON stock_corrections FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Users can insert stock corrections
CREATE POLICY "Users can insert stock corrections" 
ON stock_corrections FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = uploaded_by);

-- Policy: Users can update their own stock corrections
CREATE POLICY "Users can update own stock corrections" 
ON stock_corrections FOR UPDATE 
TO authenticated 
USING (auth.uid() = uploaded_by);

-- Drop existing functions to resolve overloading issues
DROP FUNCTION IF EXISTS get_stock_variance_by_warehouse(NUMERIC, DATE);
DROP FUNCTION IF EXISTS get_stock_variance_by_warehouse(INTEGER, DATE);
DROP FUNCTION IF EXISTS get_opening_stock_by_warehouse(NUMERIC, DATE);
DROP FUNCTION IF EXISTS get_opening_stock_by_warehouse(INTEGER, DATE);

-- Function to get stock variance for a product on a specific date per warehouse
CREATE OR REPLACE FUNCTION get_stock_variance_by_warehouse(
  p_product_id NUMERIC,
  p_date DATE
) RETURNS TABLE (
  warehouse_id UUID,
  warehouse_code VARCHAR,
  warehouse_name VARCHAR,
  calculated_closing_stock INTEGER,
  corrected_closing_stock INTEGER,
  stock_variance INTEGER,
  has_correction BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH calculated_stock AS (
    -- Calculate closing stock for each warehouse for the given date
    SELECT 
      w.uuid as warehouse_id,
      w.code as warehouse_code,
      w.name as warehouse_name,
      COALESCE(wi.quantity, 0) + COALESCE(
        (SELECT SUM(
          CASE 
            WHEN sm.movement_type IN ('purchase', 'transfer_in', 'adjustment', 'return', 'manufacturing_in', 'sales_returns') THEN sm.quantity
            WHEN sm.movement_type IN ('sale', 'transfer_out', 'wastage', 'manufacturing_out', 'purchase_returns', 'consumption') THEN -sm.quantity
            ELSE 0
          END
        )
        FROM stock_movements sm
        WHERE sm.product_id = p_product_id
          AND sm.warehouse_id = w.id
          AND DATE(sm.date) <= p_date), 0
      ) as calc_stock
    FROM warehouses w
    LEFT JOIN warehouse_inventory wi ON w.id::numeric = wi.wh_id 
      AND wi.product_id = p_product_id
  ),
  corrections AS (
    -- Get corrections for the date
    SELECT 
      sc.warehouse_id as correction_warehouse_id,
      sc.corrected_stock
    FROM stock_corrections sc
    WHERE sc.product_id = p_product_id::INTEGER
      AND sc.correction_date = p_date
  )
  SELECT 
    cs.warehouse_id,
    cs.warehouse_code,
    cs.warehouse_name,
    cs.calc_stock::INTEGER as calculated_closing_stock,
    COALESCE(c.corrected_stock, cs.calc_stock)::INTEGER as corrected_closing_stock,
    (cs.calc_stock - COALESCE(c.corrected_stock, cs.calc_stock))::INTEGER as stock_variance,
    (c.corrected_stock IS NOT NULL) as has_correction
  FROM calculated_stock cs
  LEFT JOIN corrections c ON cs.warehouse_id = c.correction_warehouse_id
  ORDER BY cs.warehouse_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get stock variance with totals for a product on a specific date per warehouse
CREATE OR REPLACE FUNCTION get_stock_variance_by_warehouse_with_totals(
  p_product_id NUMERIC,
  p_date DATE
) RETURNS TABLE (
  warehouse_id UUID,
  warehouse_code VARCHAR,
  warehouse_name VARCHAR,
  calculated_closing_stock INTEGER,
  corrected_closing_stock INTEGER,
  stock_variance INTEGER,
  has_correction BOOLEAN,
  is_total BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH calculated_stock AS (
    -- Calculate closing stock for each warehouse for the given date
    SELECT 
      w.uuid as warehouse_id,
      w.code as warehouse_code,
      w.name as warehouse_name,
      COALESCE(wi.quantity, 0) + COALESCE(
        (SELECT SUM(
          CASE 
            WHEN sm.movement_type IN ('purchase', 'transfer_in', 'adjustment', 'return', 'manufacturing_in', 'sales_returns') THEN sm.quantity
            WHEN sm.movement_type IN ('sale', 'transfer_out', 'wastage', 'manufacturing_out', 'purchase_returns', 'consumption') THEN -sm.quantity
            ELSE 0
          END
        )
        FROM stock_movements sm
        WHERE sm.product_id = p_product_id
          AND sm.warehouse_id = w.id
          AND DATE(sm.date) <= p_date), 0
      ) as calc_stock
    FROM warehouses w
    LEFT JOIN warehouse_inventory wi ON w.id::numeric = wi.wh_id 
      AND wi.product_id = p_product_id
  ),
  corrections AS (
    -- Get corrections for the date
    SELECT 
      sc.warehouse_id as correction_warehouse_id,
      sc.corrected_stock
    FROM stock_corrections sc
    WHERE sc.product_id = p_product_id::INTEGER
      AND sc.correction_date = p_date
  ),
  warehouse_data AS (
    -- Individual warehouse rows
    SELECT 
      cs.warehouse_id,
      cs.warehouse_code,
      cs.warehouse_name,
      cs.calc_stock::INTEGER as calculated_closing_stock,
      COALESCE(c.corrected_stock, cs.calc_stock)::INTEGER as corrected_closing_stock,
      (cs.calc_stock - COALESCE(c.corrected_stock, cs.calc_stock))::INTEGER as stock_variance,
      (c.corrected_stock IS NOT NULL) as has_correction,
      false as is_total
    FROM calculated_stock cs
    LEFT JOIN corrections c ON cs.warehouse_id = c.correction_warehouse_id
  ),
  grand_total AS (
    -- Grand total row
    SELECT 
      NULL::UUID as warehouse_id,
      'TOTAL' as warehouse_code,
      'Total' as warehouse_name,
      SUM(wd.calculated_closing_stock)::INTEGER as calculated_closing_stock,
      SUM(wd.corrected_closing_stock)::INTEGER as corrected_closing_stock,
      SUM(wd.stock_variance)::INTEGER as stock_variance,
      BOOL_OR(wd.has_correction) as has_correction,
      true as is_total
    FROM warehouse_data wd
  )
  SELECT * FROM warehouse_data
  UNION ALL
  SELECT * FROM grand_total
  ORDER BY is_total, warehouse_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk insert stock corrections from uploaded data with warehouse mapping
CREATE OR REPLACE FUNCTION bulk_insert_stock_corrections_with_warehouse(
  corrections_data JSONB,
  uploader_id UUID
) RETURNS TABLE (
  success_count INTEGER,
  error_count INTEGER,
  errors JSONB
) AS $$
DECLARE
  rec RECORD;
  success_cnt INTEGER := 0;
  error_cnt INTEGER := 0;
  error_list JSONB := '[]'::JSONB;
  product_odoo_id NUMERIC;
  warehouse_uuid UUID;
BEGIN
  -- Process each correction in the JSON array
  FOR rec IN SELECT * FROM jsonb_array_elements(corrections_data) AS elem
  LOOP
    BEGIN
      -- Find product by barcode
      SELECT odoo_id INTO product_odoo_id
      FROM inventory 
      WHERE barcode = (rec->>'barcode')
        AND active = true;
      
      IF product_odoo_id IS NULL THEN
        error_cnt := error_cnt + 1;
        error_list := error_list || jsonb_build_object(
          'barcode', rec->>'barcode',
          'warehouse_code', rec->>'warehouse_code',
          'error', 'Product not found'
        );
        CONTINUE;
      END IF;

      -- Find warehouse UUID by code
      SELECT uuid INTO warehouse_uuid
      FROM warehouses 
      WHERE code = (rec->>'warehouse_code')
        AND active = true;
      
      IF warehouse_uuid IS NULL THEN
        error_cnt := error_cnt + 1;
        error_list := error_list || jsonb_build_object(
          'barcode', rec->>'barcode',
          'warehouse_code', rec->>'warehouse_code',
          'error', 'Warehouse not found'
        );
        CONTINUE;
      END IF;
      
      -- Insert correction
      INSERT INTO stock_corrections (
        product_id,
        warehouse_id,
        barcode,
        correction_date,
        corrected_stock,
        uploaded_by
      ) VALUES (
        product_odoo_id::INTEGER,
        warehouse_uuid,
        rec->>'barcode',
        (rec->>'date')::DATE,
        (rec->>'stock_quantity')::INTEGER,
        uploader_id
      ) ON CONFLICT (product_id, warehouse_id, correction_date) 
      DO UPDATE SET 
        corrected_stock = EXCLUDED.corrected_stock,
        uploaded_at = NOW(),
        uploaded_by = EXCLUDED.uploaded_by;
      
      success_cnt := success_cnt + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_cnt := error_cnt + 1;
      error_list := error_list || jsonb_build_object(
        'barcode', rec->>'barcode',
        'warehouse_code', rec->>'warehouse_code',
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN QUERY SELECT success_cnt, error_cnt, error_list;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get opening stock per warehouse for a specific date
CREATE OR REPLACE FUNCTION get_opening_stock_by_warehouse(
  p_product_id NUMERIC,
  p_date DATE
) RETURNS TABLE (
  warehouse_id UUID,
  warehouse_code VARCHAR,
  warehouse_name VARCHAR,
  opening_stock INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.uuid as warehouse_id,
    w.code as warehouse_code,
    w.name as warehouse_name,
    COALESCE(wi.quantity, 0) + COALESCE(
      (SELECT SUM(
        CASE 
          WHEN sm.movement_type IN ('purchase', 'transfer_in', 'adjustment', 'return', 'manufacturing_in', 'sales_returns') THEN sm.quantity
          WHEN sm.movement_type IN ('sale', 'transfer_out', 'wastage', 'manufacturing_out', 'purchase_returns', 'consumption') THEN -sm.quantity
          ELSE 0
        END
      )
      FROM stock_movements sm
      WHERE sm.product_id = p_product_id
        AND sm.warehouse_id = w.id
        AND DATE(sm.date) < p_date), 0
    ) as opening_stock
  FROM warehouses w
  LEFT JOIN warehouse_inventory wi ON w.id::numeric = wi.wh_id 
    AND wi.product_id = p_product_id
  ORDER BY w.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on the table
COMMENT ON TABLE stock_corrections IS 'Stores uploaded actual stock counts per warehouse for variance calculation';
COMMENT ON COLUMN stock_corrections.product_id IS 'References inventory.odoo_id';
COMMENT ON COLUMN stock_corrections.warehouse_id IS 'References warehouses.id - CRITICAL for warehouse-specific corrections';
COMMENT ON COLUMN stock_corrections.correction_date IS 'Date for which the stock count applies';
COMMENT ON COLUMN stock_corrections.corrected_stock IS 'Actual stock count uploaded by user for specific warehouse';




