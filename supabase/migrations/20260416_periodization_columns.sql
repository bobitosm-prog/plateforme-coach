-- Add periodization columns to custom_programs
ALTER TABLE IF EXISTS custom_programs ADD COLUMN IF NOT EXISTS total_weeks int;
ALTER TABLE IF EXISTS custom_programs ADD COLUMN IF NOT EXISTS current_week int DEFAULT 1;
ALTER TABLE IF EXISTS custom_programs ADD COLUMN IF NOT EXISTS phases jsonb;
