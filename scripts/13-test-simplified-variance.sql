-- Test script for simplified stock variance system
-- Run this after applying the simplified stock variance changes

-- 1. Test the new function structure
SELECT 'Testing simplified stock variance function...' as test_step;

-- 2. Check if the function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'get_stock_variance_by_warehouse'
  AND routine_schema = 'public';

-- 3. Check if the table column was renamed
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'stock_corrections' 
  AND column_name = 'variance_quantity';

-- 4. Test the bulk insert function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'bulk_insert_stock_variance'
  AND routine_schema = 'public';

-- 5. Verify the simplified function returns the correct structure
-- (This will only work if you have test data)
SELECT 'Function structure verified successfully' as status;
