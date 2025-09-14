-- Remove all ON CONFLICT and related constraints from the database
-- This script will clean up all constraint-related issues

-- =====================================================
-- STEP 1: Show all current constraints
-- =====================================================
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid IN (
  'stock_movements'::regclass,
  'stock_corrections'::regclass,
  'warehouse_inventory'::regclass,
  'inventory'::regclass,
  'warehouses'::regclass
)
ORDER BY table_name, contype;

-- =====================================================
-- STEP 2: Remove exclusion constraints (ON CONFLICT)
-- =====================================================

-- Remove exclusion constraints from stock_corrections
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN 
    SELECT conname FROM pg_constraint 
    WHERE conrelid = 'stock_corrections'::regclass 
      AND contype = 'x'
  LOOP
    EXECUTE 'ALTER TABLE stock_corrections DROP CONSTRAINT IF EXISTS ' || constraint_name;
    RAISE NOTICE 'Dropped exclusion constraint: %', constraint_name;
  END LOOP;
END $$;

-- =====================================================
-- STEP 3: Remove unique constraints that might interfere
-- =====================================================

-- Remove unique constraints from stock_corrections
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN 
    SELECT conname FROM pg_constraint 
    WHERE conrelid = 'stock_corrections'::regclass 
      AND contype = 'u'
      AND conname LIKE '%product_id%warehouse_id%correction_date%'
  LOOP
    EXECUTE 'ALTER TABLE stock_corrections DROP CONSTRAINT IF EXISTS ' || constraint_name;
    RAISE NOTICE 'Dropped unique constraint: %', constraint_name;
  END LOOP;
END $$;

-- Remove unique constraints from warehouse_inventory
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN 
    SELECT conname FROM pg_constraint 
    WHERE conrelid = 'warehouse_inventory'::regclass 
      AND contype = 'u'
      AND conname LIKE '%inventory_id%warehouse%'
  LOOP
    EXECUTE 'ALTER TABLE warehouse_inventory DROP CONSTRAINT IF EXISTS ' || constraint_name;
    RAISE NOTICE 'Dropped unique constraint: %', constraint_name;
  END LOOP;
END $$;

-- =====================================================
-- STEP 4: Remove any other problematic constraints
-- =====================================================

-- Remove constraints that might prevent data insertion
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Remove constraints from stock_movements if they exist
  FOR constraint_name IN 
    SELECT conname FROM pg_constraint 
    WHERE conrelid = 'stock_movements'::regclass 
      AND contype IN ('u', 'x')  -- unique or exclusion
  LOOP
    EXECUTE 'ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS ' || constraint_name;
    RAISE NOTICE 'Dropped constraint from stock_movements: %', constraint_name;
  END LOOP;
END $$;

-- =====================================================
-- STEP 5: Verify all constraints are removed
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
  'warehouse_inventory'::regclass,
  'inventory'::regclass,
  'warehouses'::regclass
)
ORDER BY table_name, contype;

-- =====================================================
-- STEP 6: Test data insertion without constraints
-- =====================================================

-- Try to insert a test record to verify no constraints block it
-- (This is just a test - you can remove this section)
DO $$
BEGIN
  -- Test insert into stock_movements
  INSERT INTO stock_movements (
    movement_type, 
    product_id, 
    warehouse_id, 
    quantity, 
    created_at
  ) VALUES (
    'test'::stock_movement_type,
    1,
    1,
    1,
    NOW()
  );
  
  RAISE NOTICE 'Test insert successful - no constraints blocking it';
  
  -- Clean up test record
  DELETE FROM stock_movements WHERE movement_type = 'test';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 7: Summary
-- =====================================================
SELECT 
  'Constraints removed successfully' as status,
  'You can now insert data without ON CONFLICT issues' as message;


