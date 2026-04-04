-- Add fitness onboarding columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS fitness_score integer,
  ADD COLUMN IF NOT EXISTS fitness_level text,
  ADD COLUMN IF NOT EXISTS onboarding_answers jsonb,
  ADD COLUMN IF NOT EXISTS fitness_objectives text[],
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
