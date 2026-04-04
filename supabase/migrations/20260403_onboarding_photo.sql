ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_photo_completed_at timestamptz;
