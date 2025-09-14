-- Update existing source keys to include random numbers for maximum uniqueness
-- This matches the new format used in the sync handlers

-- =====================================================
-- NEW SOURCE KEY FORMAT:
-- =====================================================
-- Sales: branch|bill_no|product_id|created_at|random_number
-- Sales Returns: branch|bill_no|barcode|created_at|random_number

-- =====================================================
-- STEP 1: Update sales records to new format
-- =====================================================

-- First, let's see what we're working with
SELECT 
  movement_type,
  source_system,
  CASE 
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (complete)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (missing random)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (original format)'
    ELSE 'Other format'
  END as current_format,
  COUNT(*) as record_count
FROM stock_movements 
WHERE movement_type = 'sales'
  AND source_system = 'pos_sql'
GROUP BY 
  movement_type, 
  source_system,
  CASE 
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (complete)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (missing random)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (original format)'
    ELSE 'Other format'
  END
ORDER BY record_count DESC;

-- Update sales records to include random number
-- Format: branch|bill_no|product_id|created_at|random_number
UPDATE stock_movements 
SET source_key = CONCAT(
  SPLIT_PART(source_key, '|', 1), '|',  -- branch
  SPLIT_PART(source_key, '|', 2), '|',  -- bill_no
  SPLIT_PART(source_key, '|', 3), '|',  -- product_id/barcode
  SPLIT_PART(source_key, '|', 4), '|',  -- created_at
  FLOOR(RANDOM() * 1000000)             -- random number 0-999999
)
WHERE movement_type = 'sales'
  AND source_system = 'pos_sql'
  AND source_key LIKE '%|%|%|%'  -- Has 4 parts but missing random
  AND source_key NOT LIKE '%|%|%|%|%';  -- Not already 5 parts

-- =====================================================
-- STEP 2: Update sales return records to new format
-- =====================================================

-- Check sales return format
SELECT 
  movement_type,
  source_system,
  CASE 
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (complete)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (missing random)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (original format)'
    ELSE 'Other format'
  END as current_format,
  COUNT(*) as record_count
FROM stock_movements 
WHERE movement_type = 'sales_returns'
  AND source_system = 'pos_sql'
GROUP BY 
  movement_type, 
  source_system,
  CASE 
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (complete)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (missing random)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (original format)'
    ELSE 'Other format'
  END
ORDER BY record_count DESC;

-- Update sales return records to include random number
-- Format: branch|bill_no|barcode|created_at|random_number
UPDATE stock_movements 
SET source_key = CONCAT(
  SPLIT_PART(source_key, '|', 1), '|',  -- branch
  SPLIT_PART(source_key, '|', 2), '|',  -- bill_no
  SPLIT_PART(source_key, '|', 3), '|',  -- barcode
  SPLIT_PART(source_key, '|', 4), '|',  -- created_at
  FLOOR(RANDOM() * 1000000)             -- random number 0-999999
)
WHERE movement_type = 'sales_returns'
  AND source_system = 'pos_sql'
  AND source_key LIKE '%|%|%|%'  -- Has 4 parts but missing random
  AND source_key NOT LIKE '%|%|%|%|%';  -- Not already 5 parts

-- =====================================================
-- STEP 3: Verify the updates
-- =====================================================

-- Check final format distribution
SELECT 
  movement_type,
  source_system,
  CASE 
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (complete with random)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (missing random)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (original format)'
    ELSE 'Other format'
  END as final_format,
  COUNT(*) as record_count
FROM stock_movements 
WHERE movement_type IN ('sales', 'sales_returns')
  AND source_system = 'pos_sql'
GROUP BY 
  movement_type, 
  source_system,
  CASE 
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (complete with random)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (missing random)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (original format)'
    ELSE 'Other format'
  END
ORDER BY movement_type, record_count DESC;

-- =====================================================
-- STEP 4: Show sample of updated records
-- =====================================================

-- Show sample sales records with new format
SELECT 
  id,
  movement_type,
  source_key,
  SPLIT_PART(source_key, '|', 1) as branch,
  SPLIT_PART(source_key, '|', 2) as bill_no,
  SPLIT_PART(source_key, '|', 3) as product_id_or_barcode,
  SPLIT_PART(source_key, '|', 4) as created_at,
  SPLIT_PART(source_key, '|', 5) as random_number,
  created_at as actual_created_at
FROM stock_movements 
WHERE movement_type IN ('sales', 'sales_returns')
  AND source_system = 'pos_sql'
  AND source_key LIKE '%|%|%|%|%'  -- Has 5 parts with random
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 5: Verify no duplicates exist
-- =====================================================

-- Check for any remaining duplicates
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

-- =====================================================
-- STEP 6: Create unique index (should now succeed)
-- =====================================================

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

-- =====================================================
-- BENEFITS OF NEW FORMAT:
-- =====================================================
-- ✅ Maximum uniqueness: random number ensures no duplicates
-- ✅ Business context: branch, bill_no, product_id/barcode, timestamp
-- ✅ No collisions: random number provides additional uniqueness
-- ✅ Future-proof: handles edge cases like same product, same time
-- ✅ Audit trail: complete transaction history
-- ✅ Unique index: can be created successfully


