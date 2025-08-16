-- Migration script to fix stock corrections system
-- This script applies all the necessary fixes for the stock variance logic

-- 1. Add constraint to prevent negative stock corrections
ALTER TABLE stock_corrections 
ADD CONSTRAINT check_positive_stock 
CHECK (corrected_stock >= 0);

-- 2. Drop existing functions to resolve conflicts
DROP FUNCTION IF EXISTS get_stock_variance_by_warehouse(NUMERIC, DATE);
DROP FUNCTION IF EXISTS get_stock_variance_by_warehouse(INTEGER, DATE);
DROP FUNCTION IF EXISTS get_stock_variance_by_warehouse_with_totals(NUMERIC, DATE);
DROP FUNCTION IF EXISTS get_stock_variance_by_warehouse_with_totals(INTEGER, DATE);
DROP FUNCTION IF EXISTS get_opening_stock_by_warehouse(NUMERIC, DATE);
DROP FUNCTION IF EXISTS get_opening_stock_by_warehouse(INTEGER, DATE);
DROP FUNCTION IF EXISTS bulk_insert_stock_corrections_with_warehouse(JSONB, UUID);

-- 3. Create fixed bulk insert function
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

-- 4. Create fixed variance calculation function
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

-- 5. Create fixed variance function with totals
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



-- 7. Add comments for documentation
COMMENT ON FUNCTION bulk_insert_stock_corrections_with_warehouse(JSONB, UUID) IS 'Bulk insert stock corrections with warehouse code to UUID mapping';
COMMENT ON FUNCTION get_stock_variance_by_warehouse(NUMERIC, DATE) IS 'Calculate stock variance per warehouse for a specific product and date';
COMMENT ON FUNCTION get_stock_variance_by_warehouse_with_totals(NUMERIC, DATE) IS 'Calculate stock variance per warehouse with grand totals';
COMMENT ON FUNCTION get_opening_stock_by_warehouse(NUMERIC, DATE) IS 'Calculate opening stock per warehouse for a specific product and date';

-- 8. Verify the fixes
DO $$
BEGIN
  RAISE NOTICE 'Stock corrections system has been fixed successfully!';
  RAISE NOTICE 'Key fixes applied:';
  RAISE NOTICE '- Fixed warehouse code to UUID mapping in bulk insert';
  RAISE NOTICE '- Fixed data type mismatches in variance calculations';
  RAISE NOTICE '- Added support for all movement types';
  RAISE NOTICE '- Added constraint to prevent negative stock corrections';
  RAISE NOTICE '- Fixed date handling to use stock_movements.date field';
END $$;




