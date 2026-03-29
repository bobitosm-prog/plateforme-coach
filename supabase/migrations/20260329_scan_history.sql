-- Scan history columns for custom_foods
ALTER TABLE custom_foods ADD COLUMN IF NOT EXISTS scanned_at timestamptz;
ALTER TABLE custom_foods ADD COLUMN IF NOT EXISTS scan_count int DEFAULT 1;
