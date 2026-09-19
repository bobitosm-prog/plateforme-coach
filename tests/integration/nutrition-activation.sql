-- Disposable fixture only. No production data or accounts.
INSERT INTO public.profiles(id,updated_at) VALUES
 ('00000000-0000-4000-8000-000000000001','2026-01-01'),
 ('00000000-0000-4000-8000-000000000002','2026-01-01');
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001"}',true);
DO $$
DECLARE
 menu jsonb := '{"lundi":{},"mardi":{},"mercredi":{},"jeudi":{},"vendredi":{},"samedi":{},"dimanche":{}}';
 first_id uuid := '00000000-0000-4000-8000-000000000011';
 second_id uuid := '00000000-0000-4000-8000-000000000012';
BEGIN
 PERFORM public.activate_personal_meal_plan_v1(first_id,menu,'2026-01-01',null);
 PERFORM public.activate_personal_meal_plan_v1(first_id,menu,'2026-01-01',null);
 IF (SELECT count(*) FROM public.meal_plans) <> 1 THEN RAISE EXCEPTION 'RETRY_DUPLICATED'; END IF;
 BEGIN
   PERFORM public.activate_personal_meal_plan_v1(second_id,menu,'2026-01-02',first_id);
   RAISE EXCEPTION 'STALE_PROFILE_ACCEPTED';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 BEGIN
   PERFORM public.activate_personal_meal_plan_v1(second_id,menu,'2026-01-01',null);
   RAISE EXCEPTION 'STALE_PLAN_ACCEPTED';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 PERFORM public.activate_personal_meal_plan_v1(second_id,menu,'2026-01-01',first_id);
 IF (SELECT count(*) FROM public.meal_plans WHERE is_active) <> 1 THEN RAISE EXCEPTION 'MULTIPLE_ACTIVE'; END IF;
 BEGIN
   PERFORM public.activate_personal_meal_plan_v1(first_id,menu,'2026-01-01',null);
   RAISE EXCEPTION 'OLD_RETRY_RESURRECTED';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 IF EXISTS (SELECT 1 FROM public.profiles WHERE id='00000000-0000-4000-8000-000000000002') THEN
   RAISE EXCEPTION 'CROSS_ACCOUNT_READ';
 END IF;
END $$;
ROLLBACK;

-- Inject a failure AFTER deactivation: the transaction must restore the old plan.
INSERT INTO public.meal_plans(id,user_id,plan_data,is_active)
 VALUES ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000001','{}',true);
CREATE FUNCTION public.synthetic_fail_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'SYNTHETIC_INSERT_FAILURE' USING ERRCODE='23514'; END $$;
CREATE TRIGGER synthetic_fail_insert BEFORE INSERT ON public.meal_plans
 FOR EACH ROW EXECUTE FUNCTION public.synthetic_fail_insert();
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001"}',true);
DO $$
BEGIN
 BEGIN
   PERFORM public.activate_personal_meal_plan_v1('00000000-0000-4000-8000-000000000022',
     '{"lundi":{},"mardi":{},"mercredi":{},"jeudi":{},"vendredi":{},"samedi":{},"dimanche":{}}',
     '2026-01-01','00000000-0000-4000-8000-000000000021');
   RAISE EXCEPTION 'INJECTED_FAILURE_NOT_REACHED';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF NOT EXISTS (SELECT 1 FROM public.meal_plans WHERE id='00000000-0000-4000-8000-000000000021' AND is_active) THEN
   RAISE EXCEPTION 'OLD_PLAN_LOST';
 END IF;
END $$;
ROLLBACK;
DROP TRIGGER synthetic_fail_insert ON public.meal_plans;
DROP FUNCTION public.synthetic_fail_insert();
DO $$ BEGIN
 IF has_function_privilege('anon','public.activate_personal_meal_plan_v1(uuid,jsonb,timestamptz,uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'ANONYMOUS_EXECUTE_ALLOWED';
 END IF;
END $$;
