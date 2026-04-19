-- Add invited_by_coach column to distinguish invited vs auto-registered clients
ALTER TABLE coach_clients
  ADD COLUMN IF NOT EXISTS invited_by_coach BOOLEAN DEFAULT false;

-- Mark markoo.rosa as invited (test account for restrictions)
UPDATE coach_clients
  SET invited_by_coach = true
  WHERE client_id IN (
    SELECT id FROM profiles WHERE email = 'markoo.rosa@outlook.com'
  );
