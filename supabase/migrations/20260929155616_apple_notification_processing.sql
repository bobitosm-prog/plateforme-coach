BEGIN;
ALTER TABLE public.apple_notification_inbox
  ADD COLUMN IF NOT EXISTS lease_token uuid,
  ADD COLUMN IF NOT EXISTS lease_until timestamptz,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_code text;
ALTER TABLE public.apple_notification_inbox
  DROP CONSTRAINT IF EXISTS apple_notification_inbox_processing_status_check,
  DROP CONSTRAINT IF EXISTS apple_notification_inbox_check,
  DROP CONSTRAINT IF EXISTS apple_notification_processing_check;
ALTER TABLE public.apple_notification_inbox ADD CONSTRAINT apple_notification_processing_check CHECK (
  (notification_type = 'TEST' AND processing_status = 'test_received') OR
  (notification_type <> 'TEST' AND processing_status IN ('pending','processing','processed','retry','quarantined'))
);
CREATE INDEX IF NOT EXISTS apple_notification_retry_idx
  ON public.apple_notification_inbox(environment, next_attempt_at)
  WHERE processing_status IN ('pending','retry');
CREATE INDEX IF NOT EXISTS apple_notification_lease_idx
  ON public.apple_notification_inbox(environment, lease_until) WHERE processing_status = 'processing';
GRANT UPDATE(processing_status, lease_token, lease_until, attempts, next_attempt_at, processed_at, last_error_code)
  ON public.apple_notification_inbox TO service_role;

CREATE TABLE IF NOT EXISTS public.apple_purchase_state (
  environment text NOT NULL,
  original_transaction_id text NOT NULL,
  transaction_id text NOT NULL,
  signed_ms bigint NOT NULL,
  checked_ms bigint NOT NULL CHECK (checked_ms > 0 AND checked_ms < 8640000000000000),
  state text NOT NULL CHECK (state IN ('active','grace','lifetime','expired','billing_retry','revoked','replaced')),
  access_until_ms bigint,
  PRIMARY KEY(environment, original_transaction_id),
  FOREIGN KEY(environment, original_transaction_id)
    REFERENCES public.apple_purchase_owners(environment, original_transaction_id),
  FOREIGN KEY(environment, transaction_id, signed_ms)
    REFERENCES public.apple_transaction_evidence(environment, transaction_id, signed_ms),
  CHECK ((state IN ('active','grace') AND access_until_ms IS NOT NULL AND access_until_ms > checked_ms
    AND access_until_ms < 8640000000000000) OR
    (state NOT IN ('active','grace') AND access_until_ms IS NULL))
);
CREATE INDEX IF NOT EXISTS apple_purchase_state_evidence_idx
  ON public.apple_purchase_state(environment, transaction_id, signed_ms);
ALTER TABLE public.apple_purchase_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apple_purchase_state FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.apple_purchase_state FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.apple_purchase_state TO service_role;

CREATE OR REPLACE FUNCTION public.claim_apple_notification(p_environment text)
RETURNS SETOF public.apple_notification_inbox LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  SELECT notification_id INTO v_id FROM public.apple_notification_inbox
  WHERE environment = p_environment AND (
    (processing_status IN ('pending','retry') AND next_attempt_at <= now()) OR
    (processing_status = 'processing' AND lease_until < now()))
  ORDER BY received_at, notification_id FOR UPDATE SKIP LOCKED LIMIT 1;
  IF v_id IS NULL THEN RETURN; END IF;
  RETURN QUERY UPDATE public.apple_notification_inbox
    SET processing_status='processing', lease_token=gen_random_uuid(), lease_until=now()+interval '5 minutes',
      attempts=attempts+1, last_error_code=NULL
    WHERE environment=p_environment AND notification_id=v_id RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_apple_notification(
  p_environment text, p_notification_id uuid, p_lease_token uuid, p_retry boolean, p_error_code text
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_changed integer;
BEGIN
  IF p_error_code IS NULL OR p_error_code !~ '^APPLE_[A-Z_]{1,60}$' THEN
    RAISE EXCEPTION 'APPLE_INVALID_ERROR_CODE';
  END IF;
  UPDATE public.apple_notification_inbox SET
    processing_status=CASE WHEN p_retry THEN 'retry' ELSE 'quarantined' END,
    next_attempt_at=now()+make_interval(secs => least(3600, 30 * (2 ^ least(attempts,7)))::integer),
    lease_token=NULL, lease_until=NULL, last_error_code=p_error_code
  WHERE environment=p_environment AND notification_id=p_notification_id AND
    lease_token=p_lease_token AND processing_status='processing' AND lease_until>now();
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  RETURN v_changed=1;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_apple_notification(
  p_environment text, p_notification_id uuid, p_lease_token uuid, p_user_id uuid, p_observation jsonb
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_event public.apple_notification_inbox%ROWTYPE;
  v_tx jsonb := p_observation->'transaction';
  v_state text := p_observation->>'state';
  v_checked bigint := (p_observation->>'checkedAt')::bigint;
  v_until bigint := (p_observation->>'accessUntil')::bigint;
  v_changed integer;
BEGIN
  SELECT * INTO v_event FROM public.apple_notification_inbox
    WHERE environment=p_environment AND notification_id=p_notification_id FOR UPDATE;
  IF NOT FOUND OR p_lease_token IS NULL OR v_event.lease_until IS NULL OR v_event.processing_status<>'processing' OR v_event.lease_token IS DISTINCT FROM p_lease_token
    OR v_event.lease_until<=now() THEN RAISE EXCEPTION 'APPLE_LEASE_LOST'; END IF;
  IF v_tx->>'environment' IS DISTINCT FROM p_environment OR v_state IS NULL OR v_checked IS NULL
    OR v_checked > extract(epoch FROM clock_timestamp())*1000+300000 THEN
    RAISE EXCEPTION 'APPLE_INVALID_OBSERVATION';
  END IF;
  -- Reject inconsistent grants; only signed Apple dates and a verified API status may be stored.
  IF (v_state IN ('active','grace','lifetime') AND
       ((v_tx->>'revocationDate') IS NOT NULL OR (v_tx->>'isUpgraded')::boolean IS DISTINCT FROM false))
    OR (v_state='lifetime' AND v_tx->>'productId' <> 'ch.moovx.app.athena.lifetime')
    OR (v_state IN ('active','grace') AND (v_tx->>'expiresDate') IS NULL)
    OR (v_state='active' AND v_until IS DISTINCT FROM (v_tx->>'expiresDate')::bigint)
    OR (v_state='grace' AND v_until <= (v_tx->>'expiresDate')::bigint) THEN
    RAISE EXCEPTION 'APPLE_INVALID_OBSERVATION';
  END IF;
  PERFORM public.record_apple_transaction_evidence(p_user_id,p_environment,(v_tx->>'appAccountToken')::uuid,
    v_tx->>'transactionId',v_tx->>'originalTransactionId',v_tx->>'productId',
    (v_tx->>'purchaseDate')::bigint,(v_tx->>'signedDate')::bigint,
    (v_tx->>'expiresDate')::bigint,(v_tx->>'revocationDate')::bigint,(v_tx->>'isUpgraded')::boolean);
  INSERT INTO public.apple_purchase_state(environment,original_transaction_id,transaction_id,signed_ms,checked_ms,state,access_until_ms)
  VALUES(p_environment,v_tx->>'originalTransactionId',v_tx->>'transactionId',(v_tx->>'signedDate')::bigint,v_checked,v_state,v_until)
  ON CONFLICT(environment,original_transaction_id) DO UPDATE SET
    transaction_id=excluded.transaction_id,signed_ms=excluded.signed_ms,checked_ms=excluded.checked_ms,
    state=excluded.state,access_until_ms=excluded.access_until_ms
  WHERE excluded.signed_ms >= apple_purchase_state.signed_ms AND excluded.checked_ms > apple_purchase_state.checked_ms;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  UPDATE public.apple_notification_inbox SET processing_status='processed',processed_at=now(),
    lease_token=NULL,lease_until=NULL,last_error_code=NULL
  WHERE environment=p_environment AND notification_id=p_notification_id;
  RETURN CASE WHEN v_changed=1 THEN 'processed' ELSE 'stale' END;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_apple_notification(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.fail_apple_notification(text,uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.complete_apple_notification(text,uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_apple_notification(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_apple_notification(text,uuid,uuid,boolean,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_apple_notification(text,uuid,uuid,uuid,jsonb) TO service_role;
COMMIT;
