BEGIN;
-- Serialize opt-out with weekly training application; nutrition remains independent.
CREATE OR REPLACE FUNCTION public.apply_weekly_adjustment_v1(p_user_id uuid, p_diagnostic_id uuid, p_candidate jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  d public.weekly_diagnostics%ROWTYPE; p public.profiles%ROWTYPE;
  current_context jsonb; previous_plan jsonb; previous_days jsonb;
  local_today date := (now() AT TIME ZONE 'Europe/Zurich')::date;
  target_week date; domain text; changes jsonb;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_UNAVAILABLE' USING ERRCODE='PT409'; END IF;
  SELECT * INTO d FROM public.weekly_diagnostics WHERE id=p_diagnostic_id AND user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DIAGNOSTIC_UNAVAILABLE' USING ERRCODE='PT404'; END IF;
  IF d.applied_at IS NOT NULL THEN RETURN jsonb_build_object('already_applied',true,'applied_at',d.applied_at,'changes',d.applied_changes->'summary'); END IF;
  target_week := local_today - extract(dow FROM local_today)::integer - 6;
  IF d.policy_version <> 2 OR d.application_context IS NULL OR d.week_start <> target_week THEN
    RAISE EXCEPTION 'DIAGNOSTIC_EXPIRED' USING ERRCODE='PT409';
  END IF;
  PERFORM id FROM public.custom_programs WHERE user_id=p_user_id AND is_active FOR UPDATE;
  PERFORM id FROM public.meal_plans WHERE user_id=p_user_id AND is_active FOR UPDATE;
  current_context := public.weekly_adjustment_context_v1(p_user_id);
  IF current_context IS DISTINCT FROM d.application_context THEN
    RAISE EXCEPTION 'BASELINE_CHANGED' USING ERRCODE='PT409';
  END IF;
  IF EXISTS (SELECT 1 FROM public.coach_clients WHERE client_id=p_user_id AND status='active' AND source IN ('invitation','admin')) THEN
    RAISE EXCEPTION 'COACH_MANAGED' USING ERRCODE='42501';
  END IF;
  domain := p_candidate->>'domain';
  IF domain='nutrition' THEN
    IF d.ajustements->>'calorie_goal_new' IS NULL OR coalesce((d.ajustements->>'training_volume_delta_pct')::numeric,0) <> 0
      OR abs((d.ajustements->>'calorie_goal_new')::numeric - p.calorie_goal) > 150
      OR jsonb_typeof(p_candidate->'plan') IS DISTINCT FROM 'object'
      OR NOT (p_candidate->'plan' ?& ARRAY['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']) THEN
      RAISE EXCEPTION 'INVALID_NUTRITION_ADJUSTMENT' USING ERRCODE='PT422';
    END IF;
    IF (p_candidate->'changes'->'targets') IS DISTINCT FROM jsonb_build_object(
      'calorie_goal',d.ajustements->'calorie_goal_new','protein_goal',d.ajustements->'protein_goal_new',
      'carbs_goal',d.ajustements->'carbs_goal_new','fat_goal',d.ajustements->'fat_goal_new') THEN
      RAISE EXCEPTION 'TARGETS_CHANGED' USING ERRCODE='PT422';
    END IF;
    SELECT plan_data INTO previous_plan FROM public.meal_plans WHERE id=(current_context->>'mealPlanId')::uuid AND user_id=p_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'PLAN_UNAVAILABLE' USING ERRCODE='PT409'; END IF;
    UPDATE public.profiles SET calorie_goal=(d.ajustements->>'calorie_goal_new')::numeric,
      protein_goal=(d.ajustements->>'protein_goal_new')::numeric,
      carbs_goal=(d.ajustements->>'carbs_goal_new')::numeric,
      fat_goal=(d.ajustements->>'fat_goal_new')::numeric WHERE id=p_user_id;
    UPDATE public.meal_plans SET plan_data=p_candidate->'plan',
      total_calories=(d.ajustements->>'calorie_goal_new')::integer,
      protein_g=(d.ajustements->>'protein_goal_new')::integer,
      carbs_g=(d.ajustements->>'carbs_goal_new')::integer,
      fat_g=(d.ajustements->>'fat_goal_new')::integer
      WHERE id=(current_context->>'mealPlanId')::uuid AND user_id=p_user_id AND is_active;
  ELSIF domain='training' THEN
    PERFORM user_id FROM public.training_followup_preferences WHERE user_id=p_user_id AND enabled FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'FOLLOWUP_DISABLED' USING ERRCODE='PT409'; END IF;
    IF d.ajustements ? 'calorie_goal_new' OR coalesce((d.ajustements->>'training_volume_delta_pct')::numeric,0)=0
      OR abs((d.ajustements->>'training_volume_delta_pct')::numeric)>20
      OR jsonb_typeof(p_candidate->'days') IS DISTINCT FROM 'array' OR jsonb_array_length(p_candidate->'days') NOT BETWEEN 1 AND 7
      OR jsonb_array_length(p_candidate->'days') IS DISTINCT FROM (SELECT jsonb_array_length(days) FROM public.custom_programs WHERE id=(current_context->>'programId')::uuid AND user_id=p_user_id)
      OR ((p_candidate->'changes'->>'effectiveWeekStart') IS NOT NULL AND (p_candidate->'changes'->>'effectiveWeekStart')::date <> target_week+7) THEN
      RAISE EXCEPTION 'INVALID_TRAINING_ADJUSTMENT' USING ERRCODE='PT422';
    END IF;
    SELECT days INTO previous_days FROM public.custom_programs WHERE id=(current_context->>'programId')::uuid AND user_id=p_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'PROGRAM_UNAVAILABLE' USING ERRCODE='PT409'; END IF;
    UPDATE public.custom_programs SET days=p_candidate->'days',updated_at=clock_timestamp()
      WHERE id=(current_context->>'programId')::uuid AND user_id=p_user_id AND is_active;
  ELSE RAISE EXCEPTION 'INVALID_ADJUSTMENT_DOMAIN' USING ERRCODE='PT422'; END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACTIVE_PLAN_CHANGED' USING ERRCODE='PT409'; END IF;
  changes := jsonb_build_object('domain',domain,'summary',p_candidate->'changes',
    'previous_plan',previous_plan,'previous_days',previous_days);
  UPDATE public.weekly_diagnostics SET applied_at=clock_timestamp(),applied_changes=changes WHERE id=d.id RETURNING applied_at INTO d.applied_at;
  RETURN jsonb_build_object('already_applied',false,'applied_at',d.applied_at,'changes',p_candidate->'changes');
END $$;
REVOKE ALL ON FUNCTION public.apply_weekly_adjustment_v1(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_weekly_adjustment_v1(uuid,uuid,jsonb) TO service_role;
COMMIT;
