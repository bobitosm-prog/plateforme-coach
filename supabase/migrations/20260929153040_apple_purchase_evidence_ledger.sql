BEGIN;

-- Dark, server-only ledger. Signed evidence is NOT a current entitlement.
-- Retain token/ownership tombstones after account deletion to prevent reassignment.
CREATE TABLE IF NOT EXISTS public.apple_account_bindings (
  environment text NOT NULL CHECK (environment IN ('Production', 'Sandbox')),
  app_account_token uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, app_account_token),
  UNIQUE (environment, user_id)
);
CREATE TABLE IF NOT EXISTS public.apple_purchase_owners (
  environment text NOT NULL,
  original_transaction_id text NOT NULL CHECK (original_transaction_id ~ '^[0-9]{1,40}$'),
  app_account_token uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, original_transaction_id),
  FOREIGN KEY (environment, app_account_token)
    REFERENCES public.apple_account_bindings(environment, app_account_token)
);
CREATE INDEX IF NOT EXISTS apple_purchase_owners_token_idx
  ON public.apple_purchase_owners(environment, app_account_token);

CREATE TABLE IF NOT EXISTS public.apple_transaction_evidence (
  environment text NOT NULL,
  transaction_id text NOT NULL CHECK (transaction_id ~ '^[0-9]{1,40}$'),
  original_transaction_id text NOT NULL,
  signed_ms bigint NOT NULL CHECK (signed_ms > 0 AND signed_ms < 8640000000000000),
  product_id text NOT NULL CHECK (product_id IN (
    'ch.moovx.app.athena.monthly', 'ch.moovx.app.athena.yearly', 'ch.moovx.app.athena.lifetime')),
  purchase_ms bigint NOT NULL CHECK (purchase_ms > 0 AND purchase_ms <= signed_ms),
  expires_ms bigint,
  revoked_ms bigint,
  is_upgraded boolean NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, transaction_id, signed_ms),
  FOREIGN KEY (environment, original_transaction_id)
    REFERENCES public.apple_purchase_owners(environment, original_transaction_id),
  CHECK ((product_id = 'ch.moovx.app.athena.lifetime' AND expires_ms IS NULL)
    OR (product_id <> 'ch.moovx.app.athena.lifetime' AND expires_ms IS NOT NULL
      AND expires_ms > purchase_ms AND expires_ms < 8640000000000000)),
  CHECK (revoked_ms IS NULL OR (revoked_ms >= purchase_ms AND revoked_ms <= signed_ms))
);
CREATE INDEX IF NOT EXISTS apple_transaction_evidence_original_idx
  ON public.apple_transaction_evidence(environment, original_transaction_id, signed_ms DESC);

ALTER TABLE public.apple_account_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apple_account_bindings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.apple_purchase_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apple_purchase_owners FORCE ROW LEVEL SECURITY;
ALTER TABLE public.apple_transaction_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apple_transaction_evidence FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.apple_account_bindings, public.apple_purchase_owners,
  public.apple_transaction_evidence FROM PUBLIC, anon, authenticated, service_role;
-- No browser policies. The service may append/read, never update/delete evidence.
GRANT SELECT, INSERT ON public.apple_account_bindings, public.apple_purchase_owners,
  public.apple_transaction_evidence TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_apple_account_binding(p_user_id uuid, p_environment text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_token uuid;
BEGIN
  IF p_user_id IS NULL OR p_environment IS NULL OR p_environment NOT IN ('Production', 'Sandbox') THEN
    RAISE EXCEPTION 'APPLE_INVALID_BINDING';
  END IF;
  INSERT INTO public.apple_account_bindings(environment, user_id)
    VALUES (p_environment, p_user_id) ON CONFLICT (environment, user_id) DO NOTHING;
  SELECT app_account_token INTO STRICT v_token FROM public.apple_account_bindings
    WHERE environment = p_environment AND user_id = p_user_id;
  RETURN v_token;
END;
$$;

-- Caller must cryptographically verify first. No HTTP/browser access to this RPC.
-- Appends out-of-order evidence without overwriting newer versions or granting access.
CREATE OR REPLACE FUNCTION public.record_apple_transaction_evidence(
  p_user_id uuid, p_environment text, p_app_account_token uuid,
  p_transaction_id text, p_original_transaction_id text,
  p_product_id text, p_purchase_ms bigint, p_signed_ms bigint,
  p_expires_ms bigint, p_revoked_ms bigint, p_is_upgraded boolean
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_owner uuid;
  v_existing public.apple_transaction_evidence%ROWTYPE;
  v_inserted integer;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.apple_account_bindings
    WHERE environment = p_environment AND app_account_token = p_app_account_token AND user_id = p_user_id
  ) THEN RAISE EXCEPTION 'APPLE_ACCOUNT_MISMATCH'; END IF;

  INSERT INTO public.apple_purchase_owners(environment, original_transaction_id, app_account_token)
    VALUES (p_environment, p_original_transaction_id, p_app_account_token)
    ON CONFLICT (environment, original_transaction_id) DO NOTHING;
  SELECT app_account_token INTO STRICT v_owner FROM public.apple_purchase_owners
    WHERE environment = p_environment AND original_transaction_id = p_original_transaction_id;
  IF v_owner IS DISTINCT FROM p_app_account_token THEN
    RAISE EXCEPTION 'APPLE_OWNERSHIP_CONFLICT';
  END IF;

  -- Serializes competing versions of one transaction, including its first insertion.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'apple-evidence:' || p_environment || ':' || p_transaction_id, 0));
  SELECT * INTO v_existing FROM public.apple_transaction_evidence
    WHERE environment = p_environment AND transaction_id = p_transaction_id
    ORDER BY signed_ms DESC LIMIT 1;
  IF FOUND AND (v_existing.original_transaction_id IS DISTINCT FROM p_original_transaction_id
    OR v_existing.product_id IS DISTINCT FROM p_product_id
    OR v_existing.purchase_ms IS DISTINCT FROM p_purchase_ms) THEN
    RAISE EXCEPTION 'APPLE_TRANSACTION_CONFLICT';
  END IF;

  INSERT INTO public.apple_transaction_evidence(environment, transaction_id, original_transaction_id,
    signed_ms, product_id, purchase_ms, expires_ms, revoked_ms, is_upgraded)
    VALUES (p_environment, p_transaction_id, p_original_transaction_id,
      p_signed_ms, p_product_id, p_purchase_ms, p_expires_ms, p_revoked_ms, p_is_upgraded)
    ON CONFLICT (environment, transaction_id, signed_ms) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 1 THEN RETURN 'inserted'; END IF;

  SELECT * INTO STRICT v_existing FROM public.apple_transaction_evidence
    WHERE environment = p_environment AND transaction_id = p_transaction_id AND signed_ms = p_signed_ms;
  IF v_existing.expires_ms IS DISTINCT FROM p_expires_ms OR v_existing.revoked_ms IS DISTINCT FROM p_revoked_ms
    OR v_existing.is_upgraded IS DISTINCT FROM p_is_upgraded THEN
    RAISE EXCEPTION 'APPLE_TRANSACTION_CONFLICT';
  END IF;
  RETURN 'duplicate';
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_apple_account_binding(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_apple_transaction_evidence(uuid,text,uuid,text,text,text,bigint,bigint,bigint,bigint,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_apple_account_binding(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_apple_transaction_evidence(uuid,text,uuid,text,text,text,bigint,bigint,bigint,bigint,boolean)
  TO service_role;
COMMIT;
