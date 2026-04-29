-- Add tags column to training_programs for templates filtering/search
ALTER TABLE training_programs
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_training_programs_tags
ON training_programs USING GIN (tags);
