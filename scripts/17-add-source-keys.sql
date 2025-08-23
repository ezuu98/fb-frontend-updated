-- Add source identity columns for idempotent upserts
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS source_system text,
ADD COLUMN IF NOT EXISTS source_key text,
ADD COLUMN IF NOT EXISTS source_updated_at timestamptz;

-- Create unique index to enforce idempotency on source identity per movement type
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_movements_source
ON stock_movements (movement_type, source_system, source_key);

-- Optional: help queries that filter by created_at windows
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at
ON stock_movements (created_at);


