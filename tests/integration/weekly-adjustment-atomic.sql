BEGIN;
CREATE FUNCTION public.reject_weekly_test_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('weekly.test_fail',true)='yes' THEN RAISE EXCEPTION 'synthetic plan write failure'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER weekly_test_failure BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.reject_weekly_test_update();
SET LOCAL ROLE service_role;
DO $$
DECLARE
 u uuid := '77777777-7777-4777-8777-777777777771';
 other_user uuid := '77777777-7777-4777-8777-777777777772';
 prog uuid := gen_random_uuid(); meal uuid := gen_random_uuid(); diag uuid := gen_random_uuid();
 current_week date := (now() AT TIME ZONE 'Europe/Zurich')::date-extract(dow FROM (now() AT TIME ZONE 'Europe/Zurich'))::integer-6;
 days jsonb; candidate jsonb; output jsonb; old_plan jsonb;
BEGIN
 INSERT INTO public.profiles(id,calorie_goal,protein_goal,carbs_goal,fat_goal,current_weight,objective)
 VALUES(u,2200,160,230,71,80,'cut'),(other_user,2200,160,230,71,80,'cut');
 SELECT jsonb_agg(jsonb_build_object('name','Day '||i,'exercises',jsonb_build_array(jsonb_build_object('name','Band row','sets',3)))) INTO days FROM generate_series(1,7) i;
 INSERT INTO public.custom_programs(id,user_id,name,days) VALUES(prog,u,'Existing program',days);
 SELECT jsonb_object_agg(day,'{"meals":[]}'::jsonb) INTO old_plan
 FROM unnest(ARRAY['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']) day;
 INSERT INTO public.meal_plans(id,user_id,plan_data) VALUES(meal,u,old_plan);
 INSERT INTO public.weekly_diagnostics(id,user_id,week_start,policy_version,application_context,ajustements)
 VALUES(diag,u,current_week,2,public.weekly_adjustment_context_v1(u),'{"training_volume_delta_pct":10}');
 candidate := jsonb_build_object('domain','training','days',jsonb_set(days,'{0,exercises,0,sets}','4'),
   'changes',jsonb_build_object('setsBefore',21,'setsAfter',22,'actualPct',4.8));
 output := public.apply_weekly_adjustment_v1(u,diag,candidate);
 IF output->>'already_applied'<>'false' OR (SELECT cp.days#>>'{0,exercises,0,sets}' FROM public.custom_programs cp WHERE id=prog)<>'4'
   OR (SELECT applied_at IS NULL FROM public.weekly_diagnostics WHERE id=diag) THEN RAISE EXCEPTION 'training transaction failed'; END IF;
 IF (SELECT applied_changes->'previous_days' FROM public.weekly_diagnostics WHERE id=diag) IS DISTINCT FROM days THEN RAISE EXCEPTION 'training history missing'; END IF;
 output := public.apply_weekly_adjustment_v1(u,diag,NULL);
 IF output->>'already_applied'<>'true' THEN RAISE EXCEPTION 'retry was not idempotent'; END IF;
 IF (SELECT cp.days#>>'{0,exercises,0,sets}' FROM public.custom_programs cp WHERE id=prog)<>'4' THEN RAISE EXCEPTION 'double application'; END IF;
 BEGIN
   PERFORM public.apply_weekly_adjustment_v1(other_user,diag,candidate);
   RAISE EXCEPTION 'cross-account application';
 EXCEPTION WHEN SQLSTATE 'PT404' THEN NULL; END;
 UPDATE public.weekly_diagnostics SET applied_at=NULL,applied_changes=NULL,policy_version=1 WHERE id=diag;
 BEGIN PERFORM public.apply_weekly_adjustment_v1(u,diag,candidate); RAISE EXCEPTION 'legacy applied';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 UPDATE public.weekly_diagnostics SET policy_version=2,week_start=current_week-7 WHERE id=diag;
 BEGIN PERFORM public.apply_weekly_adjustment_v1(u,diag,candidate); RAISE EXCEPTION 'expired applied';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 UPDATE public.weekly_diagnostics SET week_start=current_week,application_context=public.weekly_adjustment_context_v1(u) WHERE id=diag;
 UPDATE public.profiles SET activity_level='high' WHERE id=u;
 BEGIN PERFORM public.apply_weekly_adjustment_v1(u,diag,candidate); RAISE EXCEPTION 'stale profile applied';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 UPDATE public.weekly_diagnostics SET application_context=public.weekly_adjustment_context_v1(u) WHERE id=diag;
 UPDATE public.custom_programs SET name='Changed elsewhere' WHERE id=prog;
 BEGIN PERFORM public.apply_weekly_adjustment_v1(u,diag,candidate); RAISE EXCEPTION 'stale program applied';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 UPDATE public.weekly_diagnostics SET application_context=public.weekly_adjustment_context_v1(u),
   ajustements='{"calorie_goal_new":2100,"protein_goal_new":160,"carbs_goal_new":210,"fat_goal_new":69}' WHERE id=diag;
 candidate := jsonb_build_object('domain','nutrition','plan',old_plan||'{"_weekly_test":true}',
   'changes','{"targets":{"calorie_goal":2100,"protein_goal":160,"carbs_goal":210,"fat_goal":69}}'::jsonb);
 PERFORM set_config('weekly.test_fail','yes',true);
 BEGIN PERFORM public.apply_weekly_adjustment_v1(u,diag,candidate); RAISE EXCEPTION 'failure not injected';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'synthetic plan write failure' THEN RAISE; END IF;
 END;
 IF (SELECT calorie_goal FROM public.profiles WHERE id=u)<>2200
   OR (SELECT plan_data FROM public.meal_plans WHERE id=meal) IS DISTINCT FROM old_plan
   OR (SELECT applied_at IS NOT NULL FROM public.weekly_diagnostics WHERE id=diag) THEN RAISE EXCEPTION 'partial update survived rollback'; END IF;
 PERFORM set_config('weekly.test_fail','no',true);
 output := public.apply_weekly_adjustment_v1(u,diag,candidate);
 IF (SELECT calorie_goal FROM public.profiles WHERE id=u)<>2100
   OR (SELECT plan_data->>'_weekly_test' FROM public.meal_plans WHERE id=meal)<>'true'
   OR (SELECT applied_at IS NULL FROM public.weekly_diagnostics WHERE id=diag) THEN RAISE EXCEPTION 'nutrition transaction incomplete'; END IF;
 IF (SELECT applied_changes->'previous_plan' FROM public.weekly_diagnostics WHERE id=diag) IS DISTINCT FROM old_plan THEN RAISE EXCEPTION 'nutrition history missing'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"77777777-7777-4777-8777-777777777771"}',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.weekly_diagnostics)<>1 THEN RAISE EXCEPTION 'own read unavailable'; END IF;
 BEGIN UPDATE public.weekly_diagnostics SET ajustements='{}'; RAISE EXCEPTION 'client decision tampering permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.apply_weekly_adjustment_v1('77777777-7777-4777-8777-777777777771',gen_random_uuid(),'{}'); RAISE EXCEPTION 'client RPC permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.weekly_adjustment_context_v1('77777777-7777-4777-8777-777777777772'); RAISE EXCEPTION 'client baseline RPC permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"77777777-7777-4777-8777-777777777772"}',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.weekly_diagnostics)<>0 THEN RAISE EXCEPTION 'cross-account read'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.apply_weekly_adjustment_v1(gen_random_uuid(),gen_random_uuid(),'{}'); RAISE EXCEPTION 'anonymous RPC permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
