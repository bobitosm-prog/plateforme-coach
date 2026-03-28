-- Add barcode + image columns to custom_foods for scanned products
ALTER TABLE custom_foods ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE custom_foods ADD COLUMN IF NOT EXISTS image_url text;
CREATE INDEX IF NOT EXISTS idx_custom_foods_barcode ON custom_foods(barcode) WHERE barcode IS NOT NULL;
