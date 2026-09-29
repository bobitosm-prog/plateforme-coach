BEGIN;
-- Server-only current-state writer shared by notification, purchase and reconciliation paths.
CREATE OR REPLACE FUNCTION public.apply_apple_purchase_observation(p_environment text,p_user_id uuid,p_observation jsonb)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_tx jsonb := p_observation->'transaction';
  v_state text := p_observation->>'state';
  v_checked bigint := (p_observation->>'checkedAt')::bigint;
  v_until bigint := (p_observation->>'accessUntil')::bigint;
  v_changed integer;
BEGIN
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
  RETURN CASE WHEN v_changed=1 THEN 'processed' ELSE 'stale' END;
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
  IF public.apply_apple_purchase_observation(p_environment,p_user_id,p_observation)='processed' THEN v_changed:=1; ELSE v_changed:=0; END IF;
  UPDATE public.apple_notification_inbox SET processing_status='processed',processed_at=now(),
    lease_token=NULL,lease_until=NULL,last_error_code=NULL
  WHERE environment=p_environment AND notification_id=p_notification_id;
  RETURN CASE WHEN v_changed=1 THEN 'processed' ELSE 'stale' END;
END;
$$;

CREATE TABLE IF NOT EXISTS public.apple_reconciliation_jobs (
  environment text NOT NULL, original_transaction_id text NOT NULL,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid, lease_until timestamptz, attempts integer NOT NULL DEFAULT 0,
  PRIMARY KEY(environment,original_transaction_id),
  FOREIGN KEY(environment,original_transaction_id) REFERENCES public.apple_purchase_owners(environment,original_transaction_id)
);
ALTER TABLE public.apple_reconciliation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apple_reconciliation_jobs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.apple_reconciliation_jobs FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.apple_reconciliation_jobs TO service_role;
CREATE INDEX IF NOT EXISTS apple_reconciliation_due_idx ON public.apple_reconciliation_jobs(environment,next_attempt_at);

CREATE OR REPLACE FUNCTION public.claim_apple_reconciliation(p_environment text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_job public.apple_reconciliation_jobs%ROWTYPE; v_result jsonb;
BEGIN
  -- Include purchases first discovered through notifications or restored by the app.
  INSERT INTO public.apple_reconciliation_jobs(environment,original_transaction_id)
    SELECT environment,original_transaction_id FROM public.apple_purchase_state WHERE environment=p_environment
    ON CONFLICT DO NOTHING;
  SELECT j.* INTO v_job FROM public.apple_reconciliation_jobs j
    JOIN public.apple_purchase_owners o USING(environment,original_transaction_id)
    JOIN public.apple_account_bindings b USING(environment,app_account_token)
    WHERE j.environment=p_environment AND b.user_id IS NOT NULL AND j.next_attempt_at<=now()
      AND (j.lease_until IS NULL OR j.lease_until<now())
    ORDER BY j.next_attempt_at,j.original_transaction_id FOR UPDATE OF j SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.apple_reconciliation_jobs SET lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=attempts+1
    WHERE environment=p_environment AND original_transaction_id=v_job.original_transaction_id RETURNING * INTO v_job;
  SELECT jsonb_build_object('userId',b.user_id,'leaseToken',v_job.lease_token,'transaction',jsonb_build_object(
    'environment',e.environment,'transactionId',e.transaction_id,'originalTransactionId',e.original_transaction_id,
    'productId',e.product_id,'appAccountToken',b.app_account_token,'purchaseDate',e.purchase_ms,'signedDate',e.signed_ms,
    'expiresDate',e.expires_ms,'revocationDate',e.revoked_ms,'isUpgraded',e.is_upgraded)) INTO v_result
    FROM public.apple_purchase_state s
    JOIN public.apple_purchase_owners o USING(environment,original_transaction_id)
    JOIN public.apple_account_bindings b USING(environment,app_account_token)
    JOIN public.apple_transaction_evidence e ON e.environment=s.environment AND e.transaction_id=s.transaction_id AND e.signed_ms=s.signed_ms
    WHERE s.environment=p_environment AND s.original_transaction_id=v_job.original_transaction_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_apple_reconciliation(p_environment text,p_original text,p_lease uuid,p_observation jsonb)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_job public.apple_reconciliation_jobs%ROWTYPE; v_user uuid; v_result text;
BEGIN
  SELECT * INTO v_job FROM public.apple_reconciliation_jobs WHERE environment=p_environment AND original_transaction_id=p_original FOR UPDATE;
  IF NOT FOUND OR p_lease IS NULL OR v_job.lease_token IS DISTINCT FROM p_lease OR v_job.lease_until IS NULL OR v_job.lease_until<=now() THEN
    RAISE EXCEPTION 'APPLE_LEASE_LOST'; END IF;
  IF p_observation IS NOT NULL THEN
    IF p_observation->'transaction'->>'originalTransactionId' IS DISTINCT FROM p_original THEN RAISE EXCEPTION 'APPLE_INVALID_OBSERVATION'; END IF;
    SELECT b.user_id INTO v_user FROM public.apple_purchase_owners o JOIN public.apple_account_bindings b USING(environment,app_account_token)
      WHERE o.environment=p_environment AND o.original_transaction_id=p_original;
    v_result:=public.apply_apple_purchase_observation(p_environment,v_user,p_observation);
  ELSE v_result:='retry'; END IF;
  UPDATE public.apple_reconciliation_jobs SET lease_token=NULL,lease_until=NULL,
    attempts=CASE WHEN p_observation IS NULL THEN attempts ELSE 0 END,
    next_attempt_at=now()+CASE WHEN p_observation IS NULL THEN interval '10 minutes' ELSE interval '6 hours' END
    WHERE environment=p_environment AND original_transaction_id=p_original;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_apple_purchase_observation(text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_apple_reconciliation(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_apple_reconciliation(text,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_apple_purchase_observation(text,uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_apple_reconciliation(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_apple_reconciliation(text,text,uuid,jsonb) TO service_role;
-- Separate service-only reader for explicitly allowlisted QA accounts.
CREATE OR REPLACE FUNCTION public.read_apple_sandbox_entitlement_states(p_user_id uuid)
RETURNS TABLE(state text, access_until_ms bigint, checked_ms bigint, product_id text,
  revoked_ms bigint, is_upgraded boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT s.state,s.access_until_ms,s.checked_ms,e.product_id,e.revoked_ms,e.is_upgraded
  FROM public.apple_account_bindings b
  JOIN public.apple_purchase_owners o ON o.environment=b.environment AND o.app_account_token=b.app_account_token
  JOIN public.apple_purchase_state s ON s.environment=o.environment AND s.original_transaction_id=o.original_transaction_id
  JOIN public.apple_transaction_evidence e ON e.environment=s.environment AND e.transaction_id=s.transaction_id
    AND e.signed_ms=s.signed_ms AND e.original_transaction_id=s.original_transaction_id
  WHERE b.user_id=p_user_id AND b.environment='Sandbox';
$$;
REVOKE ALL ON FUNCTION public.read_apple_sandbox_entitlement_states(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_apple_sandbox_entitlement_states(uuid) TO service_role;
COMMIT;
