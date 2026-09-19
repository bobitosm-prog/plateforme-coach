BEGIN;

-- Additive: existing clients keep working during rollout. No historical rows
-- are rewritten and no global unique index is added before writer migration.
CREATE OR REPLACE FUNCTION public.activate_personal_meal_plan_v1(
  p_operation_id uuid,
  p_plan jsonb,
  p_expected_profile_updated_at timestamptz,
  p_expected_active_plan_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  owner_id uuid := auth.uid();
  current_version timestamptz;
  current_plan uuid;
  existing public.meal_plans%ROWTYPE;
BEGIN
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL OR p_plan IS NULL OR jsonb_typeof(p_plan) <> 'object'
    OR NOT p_plan ?& ARRAY['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'] THEN
    RAISE EXCEPTION 'INVALID_PLAN' USING ERRCODE = '22023';
  END IF;

  -- Serialize only the short activation, including concurrent profile edits.
  SELECT updated_at INTO current_version FROM public.profiles
    WHERE id = owner_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_UNAVAILABLE' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO existing FROM public.meal_plans
    WHERE id = p_operation_id AND user_id = owner_id;
  IF FOUND THEN
    -- A retry must never resurrect a plan superseded by another operation.
    IF existing.plan_data = p_plan AND existing.is_active IS TRUE THEN
      RETURN existing.id;
    END IF;
    RAISE EXCEPTION 'ACTIVATION_CONFLICT' USING ERRCODE = 'PT409';
  END IF;

  IF current_version IS DISTINCT FROM p_expected_profile_updated_at THEN
    RAISE EXCEPTION 'PROFILE_CHANGED' USING ERRCODE = 'PT409';
  END IF;
  SELECT id INTO current_plan FROM public.meal_plans
    WHERE user_id = owner_id AND is_active IS TRUE
    ORDER BY created_at DESC NULLS LAST, id DESC LIMIT 1;
  IF current_plan IS DISTINCT FROM p_expected_active_plan_id THEN
    RAISE EXCEPTION 'PLAN_CHANGED' USING ERRCODE = 'PT409';
  END IF;

  UPDATE public.meal_plans SET is_active = false
    WHERE user_id = owner_id AND is_active IS TRUE;
  INSERT INTO public.meal_plans(id,user_id,plan_data,is_active,created_at)
    VALUES (p_operation_id,owner_id,p_plan,true,clock_timestamp());
  RETURN p_operation_id;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_personal_meal_plan_v1(uuid,jsonb,timestamptz,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_personal_meal_plan_v1(uuid,jsonb,timestamptz,uuid) TO authenticated;

COMMIT;
