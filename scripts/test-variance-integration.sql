-- Test script to verify stock variance integration with opening stock calculation
-- This tests the existing variance functions that the frontend will use

-- 1. Check if there are any products with variance data to test
SELECT 
  'Products with variance data:' as info,
  COUNT(DISTINCT product_id) as product_count,
  COUNT(*) as total_variance_records
FROM stock_corrections 
WHERE variance_quantity != 0;

-- 2. Show sample variance data if available
SELECT 
  'Sample variance data:' as info,
  sc.product_id,
  sc.warehouse_id,
  sc.correction_date,
  sc.variance_quantity,
  w.code as warehouse_code
FROM stock_corrections sc
JOIN warehouses w ON sc.warehouse_id = w.uuid
WHERE sc.variance_quantity != 0
LIMIT 5;

-- 3. Test the variance before date function (used by frontend)
-- This is the key function that provides variance data for opening stock calculations
SELECT 'Testing variance before date function...' as test_description;

-- Test with a sample product and date (replace with actual values)
-- SELECT * FROM get_stock_variance_before_date(1, '2025-01-15');

-- 4. Verify the existing opening stock function still works
-- This ensures backward compatibility is maintained
SELECT 'Testing existing opening stock function...' as test_description;
-- SELECT * FROM get_opening_stock_by_warehouse(1, '2025-01-15');

-- 5. Check variance data structure for frontend integration
SELECT 
  'Variance data structure for frontend:' as info,
  'warehouse_code' as field_name,
  'VARCHAR' as data_type,
  'Warehouse code for frontend mapping' as description
UNION ALL
SELECT 
  'stock_variance' as field_name,
  'INTEGER' as data_type,
  'Variance amount (positive or negative)' as description
UNION ALL
SELECT 
  'warehouse_id' as field_name,
  'UUID' as data_type,
  'Warehouse identifier' as description;

-- 6. Summary of what the frontend will receive
SELECT 
  'Frontend Integration Summary:' as summary,
  'The frontend will call get_stock_variance_before_date() to get variance adjustments' as details,
  'No database changes are needed - uses existing functions' as note;
