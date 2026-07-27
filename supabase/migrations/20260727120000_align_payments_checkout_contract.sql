-- Align the canonical payments schema with the existing Stripe checkout contract.
-- The columns remain nullable so this migration requires no backfill.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_checkout_session_id_unique
  ON public.payments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
