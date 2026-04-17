-- Add adjustments column to progress_photos for auto-alignment data
ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS adjustments JSONB DEFAULT '{"zoom":1,"x":0,"y":0}';
