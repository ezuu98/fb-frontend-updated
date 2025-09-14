-- Find and analyze duplicates in sales records in stock_movements table
-- This script helps identify what's causing duplicate issues

-- =====================================================
-- STEP 1: Find duplicates by source_key (most important)
-- =====================================================
SELECT 
  movement_type,
  source_system,
  source_key,
  COUNT(*) as duplicate_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record,
  MIN(id) as sample_id
FROM stock_movements 
WHERE movement_type = 'sales'
GROUP BY movement_type, source_system, source_key
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, source_key
LIMIT 20;

-- =====================================================
-- STEP 2: Find duplicates by business logic (without source_key)
-- =====================================================
SELECT 
  movement_type,
  product_id,
  warehouse_id,
  quantity,
  DATE(created_at) as sale_date,
  COUNT(*) as duplicate_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record,
  MIN(id) as sample_id
FROM stock_movements 
WHERE movement_type = 'sales'
GROUP BY movement_type, product_id, warehouse_id, quantity, DATE(created_at)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, sale_date DESC
LIMIT 20;

-- =====================================================
-- STEP 3: Find duplicates by exact timestamp (same second)
-- =====================================================
SELECT 
  movement_type,
  product_id,
  warehouse_id,
  quantity,
  created_at,
  COUNT(*) as duplicate_count,
  MIN(id) as sample_id
FROM stock_movements 
WHERE movement_type = 'sales'
GROUP BY movement_type, product_id, warehouse_id, quantity, created_at
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, created_at DESC
LIMIT 20;

-- =====================================================
-- STEP 4: Analyze source_key format distribution
-- =====================================================
SELECT 
  movement_type,
  source_system,
  CASE 
    WHEN source_key IS NULL THEN 'NULL source_key'
    WHEN source_key = '' THEN 'Empty source_key'
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (branch|bill_no|barcode|quantity|created_at)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (branch|bill_no|barcode|created_at)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (branch|bill_no|barcode)'
    WHEN source_key LIKE '%|%' THEN '2 parts'
    WHEN source_key LIKE '%' THEN '1 part'
    ELSE 'Other format'
  END as source_key_format,
  COUNT(*) as record_count
FROM stock_movements 
WHERE movement_type = 'sales'
GROUP BY 
  movement_type, 
  source_system,
  CASE 
    WHEN source_key IS NULL THEN 'NULL source_key'
    WHEN source_key = '' THEN 'Empty source_key'
    WHEN source_key LIKE '%|%|%|%|%' THEN '5 parts (branch|bill_no|barcode|quantity|created_at)'
    WHEN source_key LIKE '%|%|%|%' THEN '4 parts (branch|bill_no|barcode|created_at)'
    WHEN source_key LIKE '%|%|%' THEN '3 parts (branch|bill_no|barcode)'
    WHEN source_key LIKE '%|%' THEN '2 parts'
    WHEN source_key LIKE '%' THEN '1 part'
    ELSE 'Other format'
  END
ORDER BY movement_type, source_system, record_count DESC;

-- =====================================================
-- STEP 5: Show detailed information for a specific duplicate
-- =====================================================
-- Uncomment and modify this section to investigate specific duplicates
/*
-- Example: Replace '001|138503/PS|0015968' with an actual duplicate source_key
SELECT 
  id,
  movement_type,
  source_system,
  source_key,
  product_id,
  warehouse_id,
  quantity,
  created_at,
  source_updated_at,
  reference_number,
  notes
FROM stock_movements 
WHERE movement_type = 'sales'
  AND source_key = '001|138503/PS|0015968'  -- Replace with actual duplicate
ORDER BY created_at;
*/

-- =====================================================
-- STEP 6: Summary of duplicate situation
-- =====================================================
SELECT 
  'Total sales records' as metric,
  COUNT(*) as count
FROM stock_movements 
WHERE movement_type = 'sales'

UNION ALL

SELECT 
  'Sales records with NULL source_key' as metric,
  COUNT(*) as count
FROM stock_movements 
WHERE movement_type = 'sales' AND source_key IS NULL

UNION ALL

SELECT 
  'Sales records with empty source_key' as metric,
  COUNT(*) as count
FROM stock_movements 
WHERE movement_type = 'sales' AND source_key = ''

UNION ALL

SELECT 
  'Sales records with duplicate source_keys' as metric,
  COUNT(*) as count
FROM stock_movements sm1
WHERE movement_type = 'sales' 
  AND EXISTS (
    SELECT 1 FROM stock_movements sm2 
    WHERE sm2.movement_type = 'sales'
      AND sm2.source_key = sm1.source_key
      AND sm2.id != sm1.id
  )

UNION ALL

SELECT 
  'Unique source_keys in sales' as metric,
  COUNT(DISTINCT source_key) as count
FROM stock_movements 
WHERE movement_type = 'sales' AND source_key IS NOT NULL;


