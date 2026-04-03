ALTER TABLE progress_photos
ADD COLUMN IF NOT EXISTS ai_analysis text,
ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz;
