-- Add celebrated column to user_badges
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS celebrated BOOLEAN DEFAULT false;
