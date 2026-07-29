-- Add exercise difficulty level used by training catalog and exercise details.
ALTER TABLE public.exercises_db
ADD COLUMN IF NOT EXISTS difficulty text;
