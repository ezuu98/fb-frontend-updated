-- Fix for bulk_insert_stock_corrections_with_warehouse function
-- This fixes the "record 'rec' has no field 'elem'" error

-- Drop the existing function
DROP FUNCTION IF EXISTS bulk_insert_stock_corrections_with_warehouse(JSONB, UUID);

-- Create the fixed function
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

-- Verify the function was created successfully
SELECT 'Function bulk_insert_stock_corrections_with_warehouse fixed successfully' as status;
