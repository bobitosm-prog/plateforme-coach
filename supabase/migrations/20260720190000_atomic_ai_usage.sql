-- Atomic AI usage reservation/finalization. Additive and legacy-compatible.

ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS feature text,
  ADD COLUMN IF NOT EXISTS policy_id text,
  ADD COLUMN IF NOT EXISTS usage_status text,
  ADD COLUMN IF NOT EXISTS principal_kind text,
  ADD COLUMN IF NOT EXISTS principal_id text,
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS reason_code text,
  ADD COLUMN IF NOT EXISTS logical_model text,
  ADD COLUMN IF NOT EXISTS provider_model text,
  ADD COLUMN IF NOT EXISTS total_tokens integer,
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS attempt_count integer,
  ADD COLUMN IF NOT EXISTS estimated_cost_micros numeric(30, 0),
  ADD COLUMN IF NOT EXISTS cost_status text;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_correlation_length CHECK (correlation_id IS NULL OR length(correlation_id) BETWEEN 1 AND 128),
  ADD CONSTRAINT ai_usage_logs_feature_length CHECK (feature IS NULL OR length(feature) BETWEEN 1 AND 64),
  ADD CONSTRAINT ai_usage_logs_policy_length CHECK (policy_id IS NULL OR length(policy_id) BETWEEN 1 AND 128),
  ADD CONSTRAINT ai_usage_logs_status_check CHECK (usage_status IS NULL OR usage_status IN ('reserved', 'success', 'failed', 'cancelled')),
  ADD CONSTRAINT ai_usage_logs_principal_kind_check CHECK (principal_kind IS NULL OR principal_kind IN ('user', 'server')),
  ADD CONSTRAINT ai_usage_logs_principal_id_length CHECK (principal_id IS NULL OR length(principal_id) BETWEEN 1 AND 128),
  ADD CONSTRAINT ai_usage_logs_reason_length CHECK (reason_code IS NULL OR length(reason_code) BETWEEN 1 AND 64),
  ADD CONSTRAINT ai_usage_logs_logical_model_length CHECK (logical_model IS NULL OR length(logical_model) BETWEEN 1 AND 256),
  ADD CONSTRAINT ai_usage_logs_provider_model_length CHECK (provider_model IS NULL OR length(provider_model) BETWEEN 1 AND 256),
  ADD CONSTRAINT ai_usage_logs_tokens_in_nonnegative CHECK (tokens_in IS NULL OR tokens_in >= 0),
  ADD CONSTRAINT ai_usage_logs_tokens_out_nonnegative CHECK (tokens_out IS NULL OR tokens_out >= 0),
  ADD CONSTRAINT ai_usage_logs_total_tokens_nonnegative CHECK (total_tokens IS NULL OR total_tokens >= 0),
  ADD CONSTRAINT ai_usage_logs_duration_bounds CHECK (duration_ms IS NULL OR duration_ms BETWEEN 0 AND 300000),
  ADD CONSTRAINT ai_usage_logs_attempt_bounds CHECK (attempt_count IS NULL OR attempt_count BETWEEN 1 AND 10),
  ADD CONSTRAINT ai_usage_logs_cost_nonnegative CHECK (estimated_cost_micros IS NULL OR estimated_cost_micros >= 0),
  ADD CONSTRAINT ai_usage_logs_cost_status_check CHECK (cost_status IS NULL OR cost_status IN ('complete', 'partial', 'unavailable', 'invalid')),
  ADD CONSTRAINT ai_usage_logs_time_order CHECK (finalized_at IS NULL OR reserved_at IS NULL OR finalized_at >= reserved_at);

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_logs_correlation_unique
  ON public.ai_usage_logs (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_usage_logs_quota_reservations
  ON public.ai_usage_logs (user_id, feature, reserved_at DESC)
  WHERE correlation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ai_usage_hourly_limit(p_feature text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_feature
    WHEN 'generate-custom-program' THEN 5
    WHEN 'analyze-progress-photo' THEN 10
    WHEN 'generate-meal-plan' THEN 10
    WHEN 'analyze-body' THEN 5
    WHEN 'suggest-exercise' THEN 20
    WHEN 'analyze-meal-photo' THEN 15
    WHEN 'chat-ai' THEN 20
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.ai_usage_is_heavy(p_feature text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_feature = ANY (ARRAY['generate-meal-plan', 'generate-custom-program', 'analyze-progress-photo', 'analyze-body']);
$$;

CREATE OR REPLACE FUNCTION public.reserve_ai_usage_internal(
  p_user_id uuid,
  p_principal_kind text,
  p_principal_id text,
  p_feature text,
  p_correlation_id text,
  p_logical_model text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_policy_id text;
  v_hourly_limit integer;
  v_hourly_count integer := 0;
  v_monthly_count integer := 0;
  v_oldest_monthly_at timestamptz;
  v_existing public.ai_usage_logs%ROWTYPE;
  v_id uuid;
  v_remaining integer;
BEGIN
  IF p_user_id IS NULL OR p_principal_kind NOT IN ('user', 'server')
     OR p_principal_id !~ '^[A-Za-z0-9._:-]{1,128}$'
     OR p_feature !~ '^[a-z0-9-]{1,64}$'
     OR p_correlation_id !~ '^[A-Za-z0-9._:-]{1,128}$'
     OR (p_logical_model IS NOT NULL AND (length(p_logical_model) < 1 OR length(p_logical_model) > 256)) THEN
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'invalid_input');
  END IF;

  IF NOT p_feature = ANY (ARRAY[
    'chat-ai','generate-recipe','generate-meal-plan','analyze-meal-photo','suggest-exercise',
    'adapt-workout','generate-exercise-instructions','generate-program','generate-custom-program',
    'training-regen','suggest-overload','analyze-body','analyze-progress-photo',
    'weekly-diagnostic','weekly-diagnostic-cron'
  ]) THEN
    RETURN jsonb_build_object('status', 'unavailable', 'reason', 'unknown_feature');
  END IF;

  v_policy_id := 'ai.' || p_feature || '.v1';
  v_hourly_limit := public.ai_usage_hourly_limit(p_feature);

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_feature, 0));
  IF public.ai_usage_is_heavy(p_feature) THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':heavy-ai', 0));
  END IF;

  SELECT * INTO v_existing
  FROM public.ai_usage_logs
  WHERE correlation_id = p_correlation_id;

  IF FOUND THEN
    IF v_existing.user_id = p_user_id AND v_existing.feature = p_feature
       AND v_existing.policy_id = v_policy_id AND v_existing.principal_kind = p_principal_kind
       AND v_existing.principal_id = p_principal_id
       AND v_existing.logical_model IS NOT DISTINCT FROM p_logical_model THEN
      RETURN jsonb_build_object('status', 'allowed', 'reservationId', v_existing.id, 'idempotent', true);
    END IF;
    RETURN jsonb_build_object('status', 'conflict', 'reason', 'correlation_reused');
  END IF;

  IF v_hourly_limit IS NOT NULL THEN
    SELECT count(*) INTO v_hourly_count
    FROM public.ai_usage_logs
    WHERE user_id = p_user_id
      AND (feature = p_feature OR (feature IS NULL AND endpoint = p_feature))
      AND coalesce(reserved_at, created_at) >= v_now - interval '1 hour'
      AND (
        correlation_id IS NULL
        OR usage_status = 'success'
        OR (usage_status = 'reserved' AND expires_at > v_now)
      );
    IF v_hourly_count >= v_hourly_limit THEN
      RETURN jsonb_build_object('status', 'denied', 'reason', 'hourly_exhausted', 'retryAfterMs', 3600000);
    END IF;
  END IF;

  IF public.ai_usage_is_heavy(p_feature) THEN
    SELECT count(*), min(coalesce(reserved_at, created_at)) INTO v_monthly_count, v_oldest_monthly_at
    FROM public.ai_usage_logs
    WHERE user_id = p_user_id
      AND (
        public.ai_usage_is_heavy(feature)
        OR (feature IS NULL AND endpoint = ANY (ARRAY['generate-meal-plan','generate-custom-program','analyze-progress-photo','analyze-body']))
      )
      AND coalesce(reserved_at, created_at) >= v_now - interval '30 days'
      AND (
        (correlation_id IS NULL AND success = true)
        OR usage_status = 'success'
        OR (usage_status = 'reserved' AND expires_at > v_now)
      );
    IF v_monthly_count >= 6 THEN
      RETURN jsonb_build_object(
        'status', 'denied',
        'reason', 'monthly_exhausted',
        'retryAfterMs', greatest(0, ceil(extract(epoch FROM (v_oldest_monthly_at + interval '30 days' - v_now)) * 1000)::bigint)
      );
    END IF;
  END IF;

  INSERT INTO public.ai_usage_logs (
    user_id, endpoint, success, correlation_id, feature, policy_id, usage_status,
    principal_kind, principal_id, reserved_at, expires_at, logical_model, created_at
  ) VALUES (
    p_user_id, p_feature, false, p_correlation_id, p_feature, v_policy_id, 'reserved',
    p_principal_kind, p_principal_id, v_now, v_now + interval '15 minutes', p_logical_model, v_now
  ) RETURNING id INTO v_id;

  v_remaining := CASE WHEN v_hourly_limit IS NULL THEN NULL ELSE greatest(0, v_hourly_limit - v_hourly_count - 1) END;
  RETURN jsonb_build_object('status', 'allowed', 'reservationId', v_id, 'remaining', v_remaining, 'idempotent', false);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('status', 'conflict', 'reason', 'correlation_reused');
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_ai_usage(
  p_feature text,
  p_correlation_id text,
  p_logical_model text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('status', 'unavailable', 'reason', 'auth_required'); END IF;
  RETURN public.reserve_ai_usage_internal(v_user_id, 'user', v_user_id::text, p_feature, p_correlation_id, p_logical_model);
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_ai_usage_server(
  p_user_id uuid,
  p_principal_id text,
  p_feature text,
  p_correlation_id text,
  p_logical_model text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$ SELECT public.reserve_ai_usage_internal(p_user_id, 'server', p_principal_id, p_feature, p_correlation_id, p_logical_model); $$;

CREATE OR REPLACE FUNCTION public.finalize_ai_usage_internal(
  p_user_id uuid,
  p_principal_kind text,
  p_principal_id text,
  p_reservation_id uuid,
  p_correlation_id text,
  p_feature text,
  p_policy_id text,
  p_status text,
  p_reason_code text,
  p_logical_model text,
  p_provider_model text DEFAULT NULL,
  p_input_tokens integer DEFAULT NULL,
  p_output_tokens integer DEFAULT NULL,
  p_duration_ms integer DEFAULT NULL,
  p_attempt_count integer DEFAULT 1,
  p_estimated_cost_micros numeric DEFAULT NULL,
  p_cost_status text DEFAULT 'unavailable'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_row public.ai_usage_logs%ROWTYPE; v_total integer; v_now timestamptz := clock_timestamp();
BEGIN
  IF p_status NOT IN ('success','failed','cancelled') OR p_reason_code !~ '^[A-Za-z0-9._:-]{1,64}$'
     OR p_correlation_id !~ '^[A-Za-z0-9._:-]{1,128}$' OR p_attempt_count NOT BETWEEN 1 AND 10
     OR p_feature !~ '^[a-z0-9-]{1,64}$' OR p_policy_id !~ '^[A-Za-z0-9._:-]{1,128}$'
     OR p_duration_ms IS NULL OR p_duration_ms NOT BETWEEN 0 AND 300000
     OR p_logical_model IS NULL OR length(p_logical_model) NOT BETWEEN 1 AND 256
     OR (p_provider_model IS NOT NULL AND length(p_provider_model) NOT BETWEEN 1 AND 256)
     OR (p_input_tokens IS NOT NULL AND p_input_tokens < 0)
     OR (p_output_tokens IS NOT NULL AND p_output_tokens < 0)
     OR (p_estimated_cost_micros IS NOT NULL AND (p_estimated_cost_micros < 0 OR trunc(p_estimated_cost_micros) <> p_estimated_cost_micros))
     OR p_cost_status NOT IN ('complete','partial','unavailable','invalid') THEN
    RETURN jsonb_build_object('status','failure','reason','invalid_input');
  END IF;
  v_total := CASE WHEN p_input_tokens IS NULL OR p_output_tokens IS NULL THEN NULL ELSE p_input_tokens + p_output_tokens END;
  SELECT * INTO v_row FROM public.ai_usage_logs WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','failure','reason','not_found'); END IF;
  IF v_row.user_id <> p_user_id OR v_row.principal_kind <> p_principal_kind OR v_row.principal_id <> p_principal_id
     OR v_row.correlation_id <> p_correlation_id OR v_row.feature <> p_feature
     OR v_row.policy_id <> p_policy_id OR v_row.logical_model IS DISTINCT FROM p_logical_model THEN
    RETURN jsonb_build_object('status','conflict','reason','authority_mismatch');
  END IF;
  IF v_row.usage_status <> 'reserved' THEN
    IF v_row.usage_status = p_status AND v_row.reason_code = p_reason_code
       AND v_row.provider_model IS NOT DISTINCT FROM p_provider_model
       AND v_row.tokens_in IS NOT DISTINCT FROM p_input_tokens AND v_row.tokens_out IS NOT DISTINCT FROM p_output_tokens
       AND v_row.duration_ms IS NOT DISTINCT FROM p_duration_ms AND v_row.attempt_count IS NOT DISTINCT FROM p_attempt_count
       AND v_row.estimated_cost_micros IS NOT DISTINCT FROM p_estimated_cost_micros
       AND v_row.cost_status IS NOT DISTINCT FROM p_cost_status THEN
      RETURN jsonb_build_object('status','finalized','idempotent',true);
    END IF;
    RETURN jsonb_build_object('status','conflict','reason','already_finalized');
  END IF;
  UPDATE public.ai_usage_logs SET
    usage_status=p_status, success=(p_status='success'), finalized_at=v_now, reason_code=p_reason_code,
    logical_model=p_logical_model, provider_model=p_provider_model, tokens_in=p_input_tokens,
    tokens_out=p_output_tokens, total_tokens=v_total, duration_ms=p_duration_ms,
    attempt_count=p_attempt_count, estimated_cost_micros=p_estimated_cost_micros, cost_status=p_cost_status
  WHERE id=p_reservation_id;
  RETURN jsonb_build_object('status','finalized','idempotent',false);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_ai_usage(
  p_reservation_id uuid, p_correlation_id text, p_feature text, p_policy_id text,
  p_status text, p_reason_code text,
  p_logical_model text, p_provider_model text DEFAULT NULL, p_input_tokens integer DEFAULT NULL,
  p_output_tokens integer DEFAULT NULL, p_duration_ms integer DEFAULT NULL, p_attempt_count integer DEFAULT 1,
  p_estimated_cost_micros numeric DEFAULT NULL, p_cost_status text DEFAULT 'unavailable'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('status','failure','reason','auth_required'); END IF;
  RETURN public.finalize_ai_usage_internal(v_user_id,'user',v_user_id::text,p_reservation_id,p_correlation_id,p_feature,p_policy_id,p_status,p_reason_code,p_logical_model,p_provider_model,p_input_tokens,p_output_tokens,p_duration_ms,p_attempt_count,p_estimated_cost_micros,p_cost_status);
END; $$;

CREATE OR REPLACE FUNCTION public.finalize_ai_usage_server(
  p_user_id uuid, p_principal_id text, p_reservation_id uuid, p_correlation_id text,
  p_feature text, p_policy_id text, p_status text, p_reason_code text,
  p_logical_model text, p_provider_model text DEFAULT NULL,
  p_input_tokens integer DEFAULT NULL, p_output_tokens integer DEFAULT NULL, p_duration_ms integer DEFAULT NULL,
  p_attempt_count integer DEFAULT 1, p_estimated_cost_micros numeric DEFAULT NULL,
  p_cost_status text DEFAULT 'unavailable'
)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.finalize_ai_usage_internal(p_user_id,'server',p_principal_id,p_reservation_id,p_correlation_id,p_feature,p_policy_id,p_status,p_reason_code,p_logical_model,p_provider_model,p_input_tokens,p_output_tokens,p_duration_ms,p_attempt_count,p_estimated_cost_micros,p_cost_status);
$$;

REVOKE ALL ON public.ai_usage_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ai_usage_logs FROM authenticated;
GRANT SELECT ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_usage_logs TO service_role;

DROP POLICY IF EXISTS "Users can insert their own AI usage logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Users can view their own AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Users can view their own AI usage logs" ON public.ai_usage_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON FUNCTION public.ai_usage_hourly_limit(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_usage_is_heavy(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_ai_usage_internal(uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_ai_usage_internal(uuid,text,text,uuid,text,text,text,text,text,text,text,integer,integer,integer,integer,numeric,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_ai_usage(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_ai_usage(text,text,text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.finalize_ai_usage(uuid,text,text,text,text,text,text,text,integer,integer,integer,integer,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_ai_usage(uuid,text,text,text,text,text,text,text,integer,integer,integer,integer,numeric,text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.reserve_ai_usage_server(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_usage_server(uuid,text,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.finalize_ai_usage_server(uuid,text,uuid,text,text,text,text,text,text,text,integer,integer,integer,integer,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_ai_usage_server(uuid,text,uuid,text,text,text,text,text,text,text,integer,integer,integer,integer,numeric,text) TO service_role;
