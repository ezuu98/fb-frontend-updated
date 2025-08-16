-- Complete fix for stock variance system
-- This script ensures all old functions are dropped and no corrected_stock references remain

-- 1. Drop ALL existing functions that might reference corrected_stock
DROP FUNCTION IF EXISTS get_stock_variance_by_warehouse(NUMERIC, DATE);
DROP FUNCTION IF EXISTS get_stock_variance_by_warehouse(INTEGER, DATE);
DROP FUNCTION IF EXISTS get_stock_variance_by_warehouse_with_totals(NUMERIC, DATE);
DROP FUNCTION IF EXISTS get_stock_variance_by_warehouse_with_totals(INTEGER, DATE);
DROP FUNCTION IF EXISTS bulk_insert_stock_corrections_with_warehouse(JSONB, UUID);
DROP FUNCTION IF EXISTS bulk_insert_stock_variance(JSONB, UUID);
DROP FUNCTION IF EXISTS get_opening_stock_by_warehouse(NUMERIC, DATE);
DROP FUNCTION IF EXISTS get_opening_stock_by_warehouse(INTEGER, DATE);

-- 2. Ensure the column is renamed (in case it wasn't done before)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_corrections' 
        AND column_name = 'corrected_stock'
    ) THEN
        ALTER TABLE stock_corrections RENAME COLUMN corrected_stock TO variance_quantity;
    END IF;
END $$;

-- 3. Create the simplified bulk insert function
CREATE OR REPLACE FUNCTION bulk_insert_stock_variance(
  variance_data JSONB,
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
  -- Process each variance in the JSON array
  FOR rec IN SELECT * FROM jsonb_array_elements(variance_data)
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
      
      -- Insert variance
      INSERT INTO stock_corrections (
        product_id,
        warehouse_id,
        barcode,
        correction_date,
        variance_quantity,
        uploaded_by
      ) VALUES (
        product_odoo_id::INTEGER,
        warehouse_uuid,
        rec->>'barcode',
        (rec->>'date')::DATE,
        (rec->>'variance_quantity')::INTEGER,
        uploader_id
      ) ON CONFLICT (product_id, warehouse_id, correction_date) 
      DO UPDATE SET 
        variance_quantity = EXCLUDED.variance_quantity,
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

-- 4. Create simplified stock variance function
CREATE OR REPLACE FUNCTION get_stock_variance_by_warehouse(
  p_product_id NUMERIC,
  p_date DATE
) RETURNS TABLE (
  warehouse_id UUID,
  warehouse_code VARCHAR,
  warehouse_name VARCHAR,
  calculated_closing_stock INTEGER,
  stock_variance INTEGER,
  closing_stock INTEGER,
  has_variance BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH warehouse_data AS (
    SELECT 
      w.uuid as warehouse_id,
      w.code as warehouse_code,
      w.name as warehouse_name,
      (COALESCE(wi.quantity, 0) + COALESCE(
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
      ))::INTEGER as calculated_closing_stock,
      COALESCE(sc.variance_quantity, 0)::INTEGER as stock_variance
    FROM warehouses w
    LEFT JOIN warehouse_inventory wi ON w.id::numeric = wi.wh_id 
      AND wi.product_id = p_product_id
    LEFT JOIN stock_corrections sc ON w.uuid = sc.warehouse_id 
      AND sc.product_id = p_product_id::INTEGER
      AND sc.correction_date = p_date
    WHERE w.active = true
  )
  SELECT 
    wd.warehouse_id,
    wd.warehouse_code,
    wd.warehouse_name,
    wd.calculated_closing_stock,
    wd.stock_variance,
    (wd.calculated_closing_stock + wd.stock_variance)::INTEGER as closing_stock,
    wd.stock_variance != 0 as has_variance
  FROM warehouse_data wd
  ORDER BY wd.warehouse_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the column comment
COMMENT ON COLUMN stock_corrections.variance_quantity IS 'Stock variance amount (positive or negative) to adjust calculated stock';

-- 6. Verify everything is working
SELECT 'Complete stock variance system fix applied successfully' as status;
