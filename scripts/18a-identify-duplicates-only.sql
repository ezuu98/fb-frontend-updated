-- SAFE SCRIPT: Only identify duplicates without deleting anything
-- Run this first to see what duplicates exist before deciding how to handle them

-- Show all duplicate source key combinations
WITH duplicates AS (
  SELECT 
    movement_type,
    source_system,
    source_key,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest,
    MIN(id) as sample_id
  FROM stock_movements 
  WHERE source_system IS NOT NULL 
    AND source_key IS NOT NULL
  GROUP BY movement_type, source_system, source_key
  HAVING COUNT(*) > 1
)
SELECT 
  movement_type,
  source_system,
  source_key,
  count as duplicate_count,
  oldest,
  newest,
  sample_id
FROM duplicates
ORDER BY count DESC, movement_type, source_system;

-- Show detailed information about a specific duplicate (replace with actual values)
-- This helps you understand what the duplicates look like
/*
SELECT 
  id,
  movement_type,
  source_system,
  source_key,
  quantity,
  created_at,
  source_updated_at,
  product_id,
  warehouse_id
FROM stock_movements 
WHERE movement_type = 'sales' 
  AND source_system = 'pos_sql' 
  AND source_key = '001|138503/PS|0015968'
ORDER BY created_at;
*/

-- Summary of duplicate counts by movement type
SELECT 
  movement_type,
  COUNT(*) as duplicate_groups,
  SUM(duplicate_count) as total_duplicate_records
FROM (
  SELECT 
    movement_type,
    source_system,
    source_key,
    COUNT(*) as duplicate_count
  FROM stock_movements 
  WHERE source_system IS NOT NULL 
    AND source_key IS NOT NULL
  GROUP BY movement_type, source_system, source_key
  HAVING COUNT(*) > 1
) dupes
GROUP BY movement_type
ORDER BY total_duplicate_records DESC;


