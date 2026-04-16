-- Add scheduling columns to custom_programs
ALTER TABLE IF EXISTS custom_programs ADD COLUMN IF NOT EXISTS scheduled boolean DEFAULT false;
ALTER TABLE IF EXISTS custom_programs ADD COLUMN IF NOT EXISTS start_date date;
