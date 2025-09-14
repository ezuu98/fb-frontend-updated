-- Clean up SQL files by removing ON CONFLICT clauses
-- This script shows the patterns to remove from your SQL files

-- =====================================================
-- PATTERNS TO REMOVE FROM SQL FILES:
-- =====================================================

-- Pattern 1: ON CONFLICT (columns) DO NOTHING
-- Remove these lines from your SQL files:
/*
ON CONFLICT (name) DO NOTHING;
ON CONFLICT (code) DO NOTHING;
ON CONFLICT (barcode) DO NOTHING;
ON CONFLICT (inventory_id, warehouse_id) DO NOTHING;
ON CONFLICT (inventory_id, warehouse_code) DO NOTHING;
*/

-- Pattern 2: ON CONFLICT (columns) with custom actions
-- Remove these lines from your SQL files:
/*
ON CONFLICT (product_id, warehouse_id, correction_date)
ON CONFLICT (data_type) DO NOTHING;
*/

-- Pattern 3: Simple ON CONFLICT DO NOTHING
-- Remove these lines from your SQL files:
/*
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- FILES THAT NEED CLEANING:
-- =====================================================

-- 1. freshbasket-dashboard/scripts/04-insert-sample-data.sql
-- 2. freshbasket-dashboard/scripts/07-update-stock-movements.sql
-- 3. freshbasket-dashboard/scripts/09-create-stock-corrections.sql
-- 4. freshbasket-dashboard/scripts/10-fix-stock-corrections.sql
-- 5. freshbasket-dashboard/scripts/11-fix-bulk-insert-function.sql
-- 6. freshbasket-dashboard/scripts/12-simplified-stock-variance.sql
-- 7. freshbasket-dashboard/scripts/14-complete-variance-fix.sql
-- 8. freshbasket-dashboard/scripts/15-date-range-variance.sql
-- 9. freshbasket-dashboard/scripts/create-tables.sql
-- 10. freshbasket-backend/scripts/09-create-sync-metadata.sql

-- =====================================================
-- EXAMPLE OF CLEANED INSERT STATEMENTS:
-- =====================================================

-- BEFORE (with ON CONFLICT):
/*
INSERT INTO warehouses (code, name, location) VALUES
('BDRWH', 'Main Warehouse', 'Bedford'),
('MHOWH', 'Branch A', 'Manchester')
ON CONFLICT (code) DO NOTHING;
*/

-- AFTER (without ON CONFLICT):
/*
INSERT INTO warehouses (code, name, location) VALUES
('BDRWH', 'Main Warehouse', 'Bedford'),
('MHOWH', 'Branch A', 'Manchester');
*/

-- =====================================================
-- MANUAL CLEANUP STEPS:
-- =====================================================

-- 1. Open each SQL file in a text editor
-- 2. Search for "ON CONFLICT" (case insensitive)
-- 3. Remove the entire ON CONFLICT clause
-- 4. Ensure the INSERT statement ends with a semicolon
-- 5. Test the cleaned SQL file

-- =====================================================
-- AUTOMATED CLEANUP (if you have sed available):
-- =====================================================

-- Remove ON CONFLICT clauses from all SQL files:
/*
find . -name "*.sql" -exec sed -i '' 's/ON CONFLICT[^;]*;//g' {} \;
*/

-- This command will:
-- - Find all .sql files in current directory and subdirectories
-- - Remove ON CONFLICT clauses and everything up to the semicolon
-- - Preserve the rest of the INSERT statement

-- =====================================================
-- VERIFICATION:
-- =====================================================

-- After cleaning, verify no ON CONFLICT clauses remain:
/*
grep -r "ON CONFLICT" . --include="*.sql"
*/

-- This should return no results if all ON CONFLICT clauses were removed.


