-- Update existing sales records to include quantity and created_at in source_key
-- This makes all sales records unique and resolves the duplicate issue

-- First, let's see what we're working with
SELECT 
  movement_type,
  source_system,
  source_key,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM stock_movements 
WHERE movement_type = 'sales' 
  AND source_system = 'pos_sql'
  AND source_key LIKE '%|%|%|%'  -- Has 4 parts (branch|bill_no|barcode|created_at)
  AND source_key NOT LIKE '%|%|%|%|%'  -- But doesn't have 5 parts yet
GROUP BY movement_type, source_system, source_key
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Update sales records to include quantity in source_key
-- This transforms: branch|bill_no|barcode|created_at -> branch|bill_no|barcode|quantity|created_at
UPDATE stock_movements 
SET source_key = CONCAT(
  SPLIT_PART(source_key, '|', 1), '|',  -- branch
  SPLIT_PART(source_key, '|', 2), '|',  -- bill_no
  SPLIT_PART(source_key, '|', 3), '|',  -- barcode
  quantity, '|',                         -- quantity
  SPLIT_PART(source_key, '|', 4)        -- created_at
)
WHERE movement_type = 'sales' 
  AND source_system = 'pos_sql'
  AND source_key LIKE '%|%|%|%'  -- Has 4 parts (branch|bill_no|barcode|created_at)
  AND source_key NOT LIKE '%|%|%|%|%';  -- But doesn't have 5 parts yet

-- Update sales return records to include quantity in source_key
-- This transforms: branch|bill_no|barcode|created_at -> branch|bill_no|barcode|quantity|created_at
UPDATE stock_movements 
SET source_key = CONCAT(
  SPLIT_PART(source_key, '|', 1), '|',  -- branch
  SPLIT_PART(source_key, '|', 2), '|',  -- bill_no
  SPLIT_PART(source_key, '|', 3), '|',  -- barcode
  quantity, '|',                         -- quantity
  SPLIT_PART(source_key, '|', 4)        -- created_at
)
WHERE movement_type = 'sales_returns' 
  AND source_system = 'pos_sql'
  AND source_key LIKE '%|%|%|%'  -- Has 4 parts (branch|bill_no|barcode|created_at)
  AND source_key NOT LIKE '%|%|%|%|%';  -- But doesn't have 5 parts yet

-- Verify the updates
SELECT 
  movement_type,
  source_system,
  source_key,
  COUNT(*) as count
FROM stock_movements 
WHERE movement_type IN ('sales', 'sales_returns')
  AND source_system = 'pos_sql'
GROUP BY movement_type, source_system, source_key
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Show sample of updated records with 5-part format
SELECT 
  id,
  movement_type,
  source_system,
  source_key,
  SPLIT_PART(source_key, '|', 1) as branch,
  SPLIT_PART(source_key, '|', 2) as bill_no,
  SPLIT_PART(source_key, '|', 3) as barcode,
  SPLIT_PART(source_key, '|', 4) as quantity_from_key,
  SPLIT_PART(source_key, '|', 5) as created_at_from_key,
  quantity as actual_quantity,
  created_at as actual_created_at
FROM stock_movements 
WHERE movement_type IN ('sales', 'sales_returns')
  AND source_system = 'pos_sql'
  AND source_key LIKE '%|%|%|%|%'  -- Now has 5 parts: branch|bill_no|barcode|quantity|created_at
ORDER BY created_at DESC
LIMIT 10;

-- Now we can safely create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_movements_source
ON stock_movements (movement_type, source_system, source_key);

-- Verify the index was created successfully
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'stock_movements' 
  AND indexname = 'uq_stock_movements_source';
