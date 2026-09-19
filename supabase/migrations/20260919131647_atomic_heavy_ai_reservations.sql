BEGIN;
CREATE SCHEMA IF NOT EXISTS ai_quota_private;
REVOKE ALL ON SCHEMA ai_quota_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA ai_quota_private TO service_role;
CREATE TABLE IF NOT EXISTS ai_quota_private.reservations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL CHECK (endpoint IN ('generate-meal-plan','generate-custom-program','analyze-progress-photo','analyze-body')),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','succeeded','failed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL DEFAULT (clock_timestamp() + interval '10 minutes')
);
ALTER TABLE ai_quota_private.reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_quota_private.reservations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_quota_private.reservations TO service_role;
CREATE INDEX IF NOT EXISTS reservations_user_created ON ai_quota_private.reservations(user_id,created_at);

-- Trusted server only. User identity must come from auth.getUser(), never the body.
-- No transaction/lock is held while the provider runs.
CREATE OR REPLACE FUNCTION public.reserve_heavy_ai_v1(p_user_id uuid, p_endpoint text, p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
 v_now timestamptz;
 v_hour_limit integer;
 v_count integer;
 v_pending integer;
 v_oldest timestamptz;
 v_existing ai_quota_private.reservations%ROWTYPE;
BEGIN
 IF current_user <> 'service_role' THEN RAISE EXCEPTION 'SERVER_ONLY' USING ERRCODE='42501'; END IF;
 v_hour_limit := CASE p_endpoint WHEN 'generate-meal-plan' THEN 10 WHEN 'generate-custom-program' THEN 5
   WHEN 'analyze-progress-photo' THEN 10 WHEN 'analyze-body' THEN 5 ELSE NULL END;
 IF p_user_id IS NULL OR p_operation_id IS NULL OR v_hour_limit IS NULL THEN
   RAISE EXCEPTION 'INVALID_RESERVATION' USING ERRCODE='22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('moovx-heavy-ai:' || p_user_id::text,0));
 v_now := pg_catalog.clock_timestamp();
 SELECT * INTO v_existing FROM ai_quota_private.reservations WHERE id=p_operation_id;
 IF FOUND THEN
   IF v_existing.user_id <> p_user_id OR v_existing.endpoint <> p_endpoint THEN
     RAISE EXCEPTION 'RESERVATION_CONFLICT' USING ERRCODE='22023';
   END IF;
   RETURN jsonb_build_object('allowed',v_existing.state='pending' AND v_existing.expires_at>v_now,
     'reason','replay','operationId',p_operation_id,'limit',6,'resetIn',60);
 END IF;
 -- Attempts count hourly, including failed/expired work. Legacy logs remain counted once.
 SELECT count(*),min(created_at) INTO v_count,v_oldest FROM (
   SELECT r.created_at FROM ai_quota_private.reservations r
    WHERE r.user_id=p_user_id AND r.endpoint=p_endpoint AND r.created_at>v_now-interval '1 hour'
   UNION ALL
   SELECT l.created_at FROM public.ai_usage_logs l
    WHERE l.user_id=p_user_id AND l.endpoint=p_endpoint AND l.created_at>v_now-interval '1 hour'
      AND NOT EXISTS (SELECT 1 FROM ai_quota_private.reservations r WHERE r.id=l.id)
 ) attempts;
 IF v_count >= v_hour_limit THEN
   RETURN jsonb_build_object('allowed',false,'reason','hourly','limit',v_hour_limit,
     'resetIn',greatest(1,ceil(extract(epoch FROM v_oldest+interval '1 hour'-v_now))::integer));
 END IF;
 -- Pending reservations hold a monthly slot until settled or safely expired.
 SELECT count(*),min(release_at),count(*) FILTER (WHERE pending) INTO v_count,v_oldest,v_pending FROM (
   SELECT l.created_at+interval '30 days' AS release_at,false AS pending FROM public.ai_usage_logs l
    WHERE l.user_id=p_user_id AND l.success=true AND l.created_at>v_now-interval '30 days'
      AND l.endpoint IN ('generate-meal-plan','generate-custom-program','analyze-progress-photo','analyze-body')
   UNION ALL
   SELECT r.expires_at,true AS pending FROM ai_quota_private.reservations r
    WHERE r.user_id=p_user_id AND r.state='pending' AND r.expires_at>v_now
 ) slots;
 IF v_count >= 6 THEN
   RETURN jsonb_build_object('allowed',false,'reason',CASE WHEN v_pending>0 THEN 'busy' ELSE 'monthly' END,'limit',6,
     'resetIn',greatest(1,ceil(extract(epoch FROM v_oldest-v_now))::integer));
 END IF;
 INSERT INTO ai_quota_private.reservations(id,user_id,endpoint,created_at,expires_at)
 VALUES(p_operation_id,p_user_id,p_endpoint,v_now,v_now+interval '10 minutes');
 RETURN jsonb_build_object('allowed',true,'operationId',p_operation_id,'limit',6,'resetIn',0);
END $$;

CREATE OR REPLACE FUNCTION public.settle_heavy_ai_v1(p_user_id uuid, p_operation_id uuid, p_success boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_reservation ai_quota_private.reservations%ROWTYPE;
BEGIN
 IF current_user <> 'service_role' THEN RAISE EXCEPTION 'SERVER_ONLY' USING ERRCODE='42501'; END IF;
 IF p_user_id IS NULL OR p_operation_id IS NULL OR p_success IS NULL THEN
   RAISE EXCEPTION 'INVALID_SETTLEMENT' USING ERRCODE='22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('moovx-heavy-ai:' || p_user_id::text,0));
 SELECT * INTO v_reservation FROM ai_quota_private.reservations
 WHERE id=p_operation_id AND user_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF v_reservation.state <> 'pending' THEN
   RETURN v_reservation.state=CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END;
 END IF;
 IF p_success AND v_reservation.expires_at<=pg_catalog.clock_timestamp() THEN
   UPDATE ai_quota_private.reservations SET state='failed' WHERE id=p_operation_id;
   RETURN false;
 END IF;
 IF p_success THEN
   INSERT INTO public.ai_usage_logs(id,user_id,endpoint,success)
   VALUES(p_operation_id,p_user_id,v_reservation.endpoint,true);
 END IF;
 UPDATE ai_quota_private.reservations SET state=CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END
 WHERE id=p_operation_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_heavy_ai_v1(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.settle_heavy_ai_v1(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_heavy_ai_v1(uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_heavy_ai_v1(uuid,uuid,boolean) TO service_role;
COMMIT;
