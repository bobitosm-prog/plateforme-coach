ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coach_monthly_rate numeric(10,2) DEFAULT 50;

COMMENT ON COLUMN public.profiles.coach_monthly_rate IS
  'Monthly coaching price in CHF, validated by the coach checkout route.';
