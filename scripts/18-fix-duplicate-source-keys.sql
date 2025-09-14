-- Fix duplicate source keys before creating unique index
-- This script identifies and resolves duplicates in the source key combinations

-- First, let's see what duplicates exist
WITH duplicates AS (
  SELECT 
    movement_type,
    source_system,
    source_key,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
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
  count,
  oldest,
  newest
FROM duplicates
ORDER BY count DESC, movement_type, source_system;

-- Option 1: Keep the most recent record and delete older duplicates
-- This is safer for data integrity
DELETE FROM stock_movements 
WHERE id IN (
  SELECT sm.id
  FROM stock_movements sm
  INNER JOIN (
    SELECT 
      movement_type,
      source_system,
      source_key,
      MAX(created_at) as max_created_at
    FROM stock_movements
    WHERE source_system IS NOT NULL 
      AND source_key IS NOT NULL
    GROUP BY movement_type, source_system, source_key
    HAVING COUNT(*) > 1
  ) dupes ON sm.movement_type = dupes.movement_type
    AND sm.source_system = dupes.source_system
    AND sm.source_key = dupes.source_key
    AND sm.created_at < dupes.max_created_at
);

-- Option 2: Alternative approach - keep the record with the latest source_updated_at
-- Uncomment this if you prefer to use source_updated_at instead of created_at
/*
DELETE FROM stock_movements 
WHERE id IN (
  SELECT sm.id
  FROM stock_movements sm
  INNER JOIN (
    SELECT 
      movement_type,
      source_system,
      source_key,
      MAX(source_updated_at) as max_source_updated_at
    FROM stock_movements
    WHERE source_system IS NOT NULL 
      AND source_key IS NOT NULL
      AND source_updated_at IS NOT NULL
    GROUP BY movement_type, source_system, source_key
    HAVING COUNT(*) > 1
  ) dupes ON sm.movement_type = dupes.movement_type
    AND sm.source_system = dupes.source_system
    AND sm.source_key = dupes.source_key
    AND sm.source_updated_at < dupes.max_source_updated_at
);
*/

-- Verify duplicates are resolved
SELECT 
  movement_type,
  source_system,
  source_key,
  COUNT(*) as count
FROM stock_movements 
WHERE source_system IS NOT NULL 
  AND source_key IS NOT NULL
GROUP BY movement_type, source_system, source_key
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Now we can safely create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_movements_source
ON stock_movements (movement_type, source_system, source_key);

-- Verify the index was created
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'stock_movements' 
  AND indexname = 'uq_stock_movements_source';


