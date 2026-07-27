-- Staging-only schema projection of 20260419_invited_by_coach.sql.
-- The historical personal-email UPDATE is intentionally excluded.
ALTER TABLE public.coach_clients
  ADD COLUMN IF NOT EXISTS invited_by_coach boolean DEFAULT false;
