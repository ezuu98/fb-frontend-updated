-- Quick script to find duplicates in sales records
-- Run this first to get a quick overview

-- Find all duplicate source_keys in sales records
SELECT 
  source_key,
  COUNT(*) as duplicate_count,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence,
  MIN(id) as first_id,
  MAX(id) as last_id
FROM stock_movements 
WHERE movement_type = 'sales'
  AND source_key IS NOT NULL
GROUP BY source_key
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, source_key
LIMIT 10;

-- Show the actual duplicate records for the first few duplicates
-- This helps you see exactly what's duplicated
WITH top_duplicates AS (
  SELECT source_key
  FROM stock_movements 
  WHERE movement_type = 'sales'
    AND source_key IS NOT NULL
  GROUP BY source_key
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC
  LIMIT 3
)
SELECT 
  sm.id,
  sm.source_key,
  sm.product_id,
  sm.warehouse_id,
  sm.quantity,
  sm.created_at,
  sm.source_updated_at
FROM stock_movements sm
INNER JOIN top_duplicates td ON sm.source_key = td.source_key
WHERE sm.movement_type = 'sales'
ORDER BY sm.source_key, sm.created_at;


