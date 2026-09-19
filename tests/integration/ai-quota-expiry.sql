-- Synthetic crash/expiry and permissions checks, rolled back in the fixture.
BEGIN;
INSERT INTO public.profiles(id) VALUES ('00000000-0000-4000-8000-000000000081');
INSERT INTO ai_quota_private.reservations(id,user_id,endpoint,expires_at)
VALUES('00000000-0000-4000-8000-000000000082','00000000-0000-4000-8000-000000000081',
 'generate-meal-plan',clock_timestamp()-interval '1 second');
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF public.settle_heavy_ai_v1('00000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000082',true)
 THEN RAISE EXCEPTION 'EXPIRED_SUCCESS_ACCEPTED'; END IF;
 IF EXISTS(SELECT 1 FROM public.ai_usage_logs WHERE user_id='00000000-0000-4000-8000-000000000081')
 THEN RAISE EXCEPTION 'EXPIRED_USAGE_BILLED'; END IF;
 IF NOT (public.reserve_heavy_ai_v1('00000000-0000-4000-8000-000000000081','generate-meal-plan',
   '00000000-0000-4000-8000-000000000083')->>'allowed')::boolean
 THEN RAISE EXCEPTION 'EXPIRED_RESERVATION_BLOCKS_NEW_WORK'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_schema_privilege('authenticated','ai_quota_private','USAGE')
 OR has_table_privilege('authenticated','ai_quota_private.reservations','INSERT')
 OR has_function_privilege('anon','public.reserve_heavy_ai_v1(uuid,text,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','public.settle_heavy_ai_v1(uuid,uuid,boolean)','EXECUTE')
 THEN RAISE EXCEPTION 'RESERVATION_PRIVILEGES_LEAKED'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='ai_quota_private.reservations'::regclass)
 THEN RAISE EXCEPTION 'RESERVATION_RLS_DISABLED'; END IF;
END $$;
ROLLBACK;
