-- Remove all ON CONFLICT constraints from the database
-- This script removes the conflict handling that prevents duplicates

-- =====================================================
-- STEP 1: Remove ON CONFLICT constraints from stock_corrections table
-- =====================================================

-- First, let's see what constraints exist
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'stock_corrections'::regclass
  AND contype = 'x';  -- exclusion constraints

-- Drop the exclusion constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'stock_corrections'::regclass 
      AND contype = 'x'
  ) THEN
    ALTER TABLE stock_corrections DROP CONSTRAINT IF EXISTS stock_corrections_product_id_warehouse_id_correction_date_excl;
  END IF;
END $$;

-- =====================================================
-- STEP 2: Remove unique constraints that might cause conflicts
-- =====================================================

-- Check for unique constraints on stock_corrections
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'stock_corrections'::regclass
  AND contype = 'u';  -- unique constraints

-- Drop unique constraints if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'stock_corrections'::regclass 
      AND contype = 'u'
      AND conname LIKE '%product_id%warehouse_id%correction_date%'
  ) THEN
    ALTER TABLE stock_corrections DROP CONSTRAINT IF EXISTS stock_corrections_product_id_warehouse_id_correction_date_key;
  END IF;
END $$;

-- =====================================================
-- STEP 3: Remove any other unique constraints that might interfere
-- =====================================================

-- Check for other unique constraints
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid IN (
  'stock_movements'::regclass,
  'stock_corrections'::regclass,
  'warehouse_inventory'::regclass
)
  AND contype = 'u';  -- unique constraints

-- =====================================================
-- STEP 4: Verify constraints are removed
-- =====================================================

-- Show remaining constraints
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid IN (
  'stock_movements'::regclass,
  'stock_corrections'::regclass,
  'warehouse_inventory'::regclass
)
ORDER BY table_name, contype;

-- =====================================================
-- STEP 5: Alternative approach - Drop and recreate tables without constraints
-- =====================================================

-- If you want to completely remove all constraints, you can:
-- 1. Drop the tables
-- 2. Recreate them without ON CONFLICT clauses
-- 3. Re-import the data

-- WARNING: This will delete all data in these tables
-- Only run this if you're sure you want to start fresh

/*
-- Uncomment these lines if you want to completely recreate tables without constraints

-- Drop tables (WARNING: This deletes all data)
DROP TABLE IF EXISTS stock_corrections CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS warehouse_inventory CASCADE;

-- Recreate tables without ON CONFLICT constraints
-- (You would need to recreate the CREATE TABLE statements without ON CONFLICT)
*/


