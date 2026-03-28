-- Add trial period field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Set trial_ends_at = created_at + 10 days for existing clients without subscription
UPDATE profiles
SET trial_ends_at = created_at + interval '10 days'
WHERE role = 'client'
  AND (subscription_status IS NULL OR subscription_status = '')
  AND trial_ends_at IS NULL;
