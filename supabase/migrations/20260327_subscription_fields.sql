-- Add new subscription fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- subscription_status already exists, ensure it accepts new values
-- subscription_type: 'client_monthly' | 'client_yearly' | 'client_lifetime' | 'coach_monthly' | 'invited'
-- subscription_status: 'active' | 'canceled' | 'past_due' | 'lifetime' | 'expired'

-- stripe_customer_id already exists
-- stripe_subscription_id: to track the Stripe subscription for cancellation

-- Set invited status for clients already linked to a coach
UPDATE profiles p
SET subscription_type = 'invited',
    subscription_status = 'active'
FROM coach_clients cc
WHERE cc.client_id = p.id
  AND (p.subscription_type IS NULL OR p.subscription_type = '');
