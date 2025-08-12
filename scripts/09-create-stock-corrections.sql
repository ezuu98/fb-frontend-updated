-- Create stock_corrections table for tracking uploaded actual stock counts per warehouse
CREATE TABLE IF NOT EXISTS stock_corrections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id INTEGER NOT NULL, -- Matches inventory.id (INTEGER)
  warehouse_id UUID NOT NULL, -- Matches warehouse ID (UUID)
  barcode VARCHAR(50) NOT NULL,
  correction_date DATE NOT NULL,
  corrected_stock INTEGER NOT NULL,
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

-- Function to get stock variance for a product on a specific date per warehouse (aggregated by warehouse code)
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
            WHEN sm.movement_type IN ('purchase', 'transfer_in', 'adjustment', 'return') THEN sm.quantity
            WHEN sm.movement_type IN ('sale', 'transfer_out', 'wastage') THEN -sm.quantity
            ELSE 0
          END
        )
        FROM stock_movements sm
        WHERE sm.product_id = p_product_id
          AND sm.warehouse_id = w.id
          AND DATE(sm.created_at) <= p_date), 0
      ) as calc_stock
    FROM warehouses w
    LEFT JOIN warehouse_inventory wi ON w.id = wi.wh_id 
      AND wi.product_id = p_product_id
  ),
  corrections AS (
    -- Get corrections for the date
    SELECT 
      sc.warehouse_id as correction_warehouse_id,
      sc.corrected_stock
    FROM stock_corrections sc
    WHERE sc.product_id = p_product_id
      AND sc.correction_date = p_date
  ),
  aggregated_data AS (
    -- Aggregate by warehouse code
    SELECT 
      cs.warehouse_code,
      cs.warehouse_name,
      SUM(cs.calc_stock) as total_calc_stock,
      SUM(COALESCE(c.corrected_stock, cs.calc_stock)) as total_corrected_stock,
      MAX(cs.warehouse_id) as warehouse_id, -- Use one warehouse ID per code
      BOOL_OR(c.corrected_stock IS NOT NULL) as has_correction
    FROM calculated_stock cs
    LEFT JOIN corrections c ON cs.warehouse_id = c.correction_warehouse_id
    GROUP BY cs.warehouse_code, cs.warehouse_name
  )
  SELECT 
    ad.warehouse_id,
    ad.warehouse_code,
    ad.warehouse_name,
    ad.total_calc_stock::INTEGER as calculated_closing_stock,
    ad.total_corrected_stock::INTEGER as corrected_closing_stock,
    (ad.total_calc_stock - ad.total_corrected_stock)::INTEGER as stock_variance,
    ad.has_correction
  FROM aggregated_data ad
  ORDER BY ad.warehouse_code;
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
            WHEN sm.movement_type IN ('purchase', 'transfer_in', 'adjustment', 'return') THEN sm.quantity
            WHEN sm.movement_type IN ('sale', 'transfer_out', 'wastage') THEN -sm.quantity
            ELSE 0
          END
        )
        FROM stock_movements sm
        WHERE sm.product_id = p_product_id
          AND sm.warehouse_id = w.id
          AND DATE(sm.created_at) <= p_date), 0
      ) as calc_stock
    FROM warehouses w
    LEFT JOIN warehouse_inventory wi ON w.id = wi.wh_id 
      AND wi.product_id = p_product_id
  ),
  corrections AS (
    -- Get corrections for the date
    SELECT 
      sc.warehouse_id as correction_warehouse_id,
      sc.corrected_stock
    FROM stock_corrections sc
    WHERE sc.product_id = p_product_id
      AND sc.correction_date = p_date
  ),
  aggregated_data AS (
    -- Aggregate by warehouse code
    SELECT 
      cs.warehouse_code,
      cs.warehouse_name,
      SUM(cs.calc_stock) as total_calc_stock,
      SUM(COALESCE(c.corrected_stock, cs.calc_stock)) as total_corrected_stock,
      MAX(cs.warehouse_id) as warehouse_id, -- Use one warehouse ID per code
      BOOL_OR(c.corrected_stock IS NOT NULL) as has_correction
    FROM calculated_stock cs
    LEFT JOIN corrections c ON cs.warehouse_id = c.correction_warehouse_id
    GROUP BY cs.warehouse_code, cs.warehouse_name
  ),
  warehouse_totals AS (
    -- Individual warehouse rows
    SELECT 
      ad.warehouse_id,
      ad.warehouse_code,
      ad.warehouse_name,
      ad.total_calc_stock::INTEGER as calculated_closing_stock,
      ad.total_corrected_stock::INTEGER as corrected_closing_stock,
      (ad.total_calc_stock - ad.total_corrected_stock)::INTEGER as stock_variance,
      ad.has_correction,
      false as is_total
    FROM aggregated_data ad
  ),
  grand_total AS (
    -- Grand total row
    SELECT 
      NULL::UUID as warehouse_id,
      'TOTAL' as warehouse_code,
      'Total' as warehouse_name,
      SUM(ad.total_calc_stock)::INTEGER as calculated_closing_stock,
      SUM(ad.total_corrected_stock)::INTEGER as corrected_closing_stock,
      SUM(ad.total_calc_stock - ad.total_corrected_stock)::INTEGER as stock_variance,
      BOOL_OR(ad.has_correction) as has_correction,
      true as is_total
    FROM aggregated_data ad
  )
  SELECT * FROM warehouse_totals
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
  warehouse_id UUID;
BEGIN
  -- Process each correction in the JSON array
  FOR rec IN SELECT * FROM jsonb_array_elements(corrections_data)
  LOOP
    BEGIN
      -- Find product by barcode
      SELECT odoo_id INTO product_odoo_id
      FROM inventory 
      WHERE barcode = (rec.value->>'barcode');
      
      IF product_odoo_id IS NULL THEN
        error_cnt := error_cnt + 1;
        error_list := error_list || jsonb_build_object(
          'barcode', rec.value->>'barcode',
          'warehouse_code', rec.value->>'warehouse_code',
          'error', 'Product not found'
        );
        CONTINUE;
      END IF;

      -- Find warehouse by code
      SELECT uuid INTO warehouse_id
      FROM warehouses 
      WHERE code = (rec.value->>'warehouse_code');
      
      IF warehouse_id IS NULL THEN
        error_cnt := error_cnt + 1;
        error_list := error_list || jsonb_build_object(
          'barcode', rec.value->>'barcode',
          'warehouse_code', rec.value->>'warehouse_code',
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
        product_odoo_id,
        warehouse_id,
        rec.value->>'barcode',
        TO_DATE(rec.value->>'date', 'DD/MM/YYYY'),
        (rec.value->>'stock_quantity')::INTEGER,
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
        'barcode', rec.value->>'barcode',
        'warehouse_code', rec.value->>'warehouse_code',
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
          WHEN sm.movement_type IN ('purchase', 'transfer_in', 'adjustment', 'return') THEN sm.quantity
          WHEN sm.movement_type IN ('sale', 'transfer_out', 'wastage') THEN -sm.quantity
          ELSE 0
        END
      )
      FROM stock_movements sm
      WHERE sm.product_id = p_product_id
        AND sm.warehouse_id = w.id
        AND DATE(sm.created_at) < p_date), 0
    ) as opening_stock
  FROM warehouses w
  LEFT JOIN warehouse_inventory wi ON w.id = wi.wh_id 
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




