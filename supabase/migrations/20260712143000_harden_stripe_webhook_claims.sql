-- Additive webhook state machine. Existing successful rows remain successful.
ALTER TABLE public.stripe_webhook_events
  DROP CONSTRAINT IF EXISTS stripe_webhook_events_processing_status_check;

ALTER TABLE public.stripe_webhook_events
  ADD CONSTRAINT stripe_webhook_events_processing_status_check
  CHECK (processing_status IN ('processing', 'success', 'failed', 'skipped'));

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count > 0);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS stripe_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_event_id_key
  ON public.payments (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_id text;
  current_status text;
BEGIN
  INSERT INTO public.stripe_webhook_events (
    event_id, event_type, payload, processing_status, processing_started_at
  ) VALUES (
    p_event_id, p_event_type, p_payload, 'processing', now()
  )
  ON CONFLICT (event_id) DO NOTHING
  RETURNING event_id INTO claimed_id;

  IF claimed_id IS NOT NULL THEN
    RETURN 'claimed';
  END IF;

  UPDATE public.stripe_webhook_events
  SET processing_status = 'processing',
      processing_started_at = now(),
      completed_at = NULL,
      error_message = NULL,
      payload = p_payload,
      event_type = p_event_type,
      attempt_count = attempt_count + 1
  WHERE event_id = p_event_id
    AND (
      processing_status = 'failed'
      OR (
        processing_status = 'processing'
        AND processing_started_at < now() - interval '5 minutes'
      )
    )
  RETURNING event_id INTO claimed_id;

  IF claimed_id IS NOT NULL THEN
    RETURN 'claimed_retry';
  END IF;

  SELECT processing_status INTO current_status
  FROM public.stripe_webhook_events
  WHERE event_id = p_event_id;

  RETURN CASE current_status
    WHEN 'success' THEN 'already_success'
    WHEN 'skipped' THEN 'already_skipped'
    WHEN 'processing' THEN 'already_processing'
    ELSE 'claim_failed'
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_stripe_webhook_event(
  p_event_id text,
  p_status text,
  p_error_message text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_id text;
BEGIN
  IF p_status NOT IN ('success', 'failed', 'skipped') THEN
    RAISE EXCEPTION 'invalid webhook final status';
  END IF;

  UPDATE public.stripe_webhook_events
  SET processing_status = p_status,
      error_message = CASE WHEN p_status = 'failed' THEN left(p_error_message, 1000) ELSE NULL END,
      completed_at = now()
  WHERE event_id = p_event_id
    AND processing_status = 'processing'
  RETURNING event_id INTO updated_id;

  RETURN updated_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_stripe_webhook_event(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_stripe_webhook_event(text, text, text) TO service_role;

COMMENT ON FUNCTION public.claim_stripe_webhook_event(text, text, jsonb) IS
  'Atomically claims a new/failed/stale Stripe event. The event_id primary key remains the concurrency lock.';
