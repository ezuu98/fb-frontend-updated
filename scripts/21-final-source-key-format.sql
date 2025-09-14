-- Final Source Key Format Implementation
-- This script shows the complete 5-part source key structure

-- =====================================================
-- NEW SOURCE KEY FORMAT: 5-PART STRUCTURE
-- =====================================================
-- Format: branch|bill_no|barcode|quantity|created_at
-- Example: "001|138503/PS|0015968|5|2025-01-15T10:30:00.000Z"

-- =====================================================
-- IMPLEMENTATION STEPS:
-- =====================================================

-- Step 1: Check current source key structure
SELECT 
  movement_type,
  source_system,
  CASE 
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (complete)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (missing quantity)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (original format)'
    ELSE 'Other format'
  END as current_format,
  COUNT(*) as record_count
FROM stock_movements 
WHERE movement_type IN ('sales', 'sales_returns')
  AND source_system = 'pos_sql'
GROUP BY 
  movement_type, 
  source_system,
  CASE 
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (complete)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (missing quantity)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (original format)'
    ELSE 'Other format'
  END
ORDER BY movement_type, current_format;

-- Step 2: Update records that still have the old 3-part format
-- Add quantity and created_at to make them 5-part
UPDATE stock_movements 
SET source_key = CONCAT(source_key, '|', quantity, '|', created_at)
WHERE movement_type IN ('sales', 'sales_returns')
  AND source_system = 'pos_sql'
  AND source_key LIKE '%|%|%'  -- Has 3 parts (original format)
  AND source_key NOT LIKE '%|%|%|%|%';  -- Not already 5 parts

-- Step 3: Update records that have 4-part format (missing quantity)
-- Add quantity to make them 5-part
UPDATE stock_movements 
SET source_key = CONCAT(
  SPLIT_PART(source_key, '|', 1), '|',  -- branch
  SPLIT_PART(source_key, '|', 2), '|',  -- bill_no
  SPLIT_PART(source_key, '|', 3), '|',  -- barcode
  quantity, '|',                         -- quantity
  SPLIT_PART(source_key, '|', 4)        -- created_at
)
WHERE movement_type IN ('sales', 'sales_returns')
  AND source_system = 'pos_sql'
  AND source_key LIKE '%|%|%|%'  -- Has 4 parts
  AND source_key NOT LIKE '%|%|%|%|%';  -- Not already 5 parts

-- Step 4: Verify all records now have 5-part format
SELECT 
  movement_type,
  source_system,
  CASE 
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (complete)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (missing quantity)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (original format)'
    ELSE 'Other format'
  END as current_format,
  COUNT(*) as record_count
FROM stock_movements 
WHERE movement_type IN ('sales', 'sales_returns')
  AND source_system = 'pos_sql'
GROUP BY 
  movement_type, 
  source_system,
  CASE 
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (complete)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (missing quantity)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (original format)'
    ELSE 'Other format'
  END
ORDER BY movement_type, current_format;

-- Step 5: Show sample of properly formatted 5-part source keys
SELECT 
  id,
  movement_type,
  source_key,
  SPLIT_PART(source_key, '|', 1) as branch,
  SPLIT_PART(source_key, '|', 2) as bill_no,
  SPLIT_PART(source_key, '|', 3) as barcode,
  SPLIT_PART(source_key, '|', 4) as quantity,
  SPLIT_PART(source_key, '|', 5) as created_at,
  quantity as actual_quantity,
  created_at as actual_created_at
FROM stock_movements 
WHERE movement_type IN ('sales', 'sales_returns')
  AND source_system = 'pos_sql'
  AND source_key LIKE '%|%|%|%|%'  -- Has 5 parts
ORDER BY created_at DESC
LIMIT 10;

-- Step 6: Verify no duplicates exist with the new format
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

-- Step 7: Create the unique index (should now succeed)
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_movements_source
ON stock_movements (movement_type, source_system, source_key);

-- Step 8: Verify the index was created successfully
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'stock_movements' 
  AND indexname = 'uq_stock_movements_source';

-- =====================================================
-- BENEFITS OF 5-PART FORMAT:
-- =====================================================
-- ✅ Maximum uniqueness: branch|bill_no|barcode|quantity|created_at
-- ✅ Business context preserved: all key business fields included
-- ✅ Temporal tracking: created_at shows when transaction occurred
-- ✅ Quantity tracking: shows how much was sold/returned
-- ✅ No duplicates possible: each record is truly unique
-- ✅ Audit trail: complete history of each transaction
-- ✅ Future syncs: will work without conflicts


