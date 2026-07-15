-- Cross-profile visibility is limited to an active coach/client relationship
-- and to the explicit projection below. A profile owner keeps using profiles.

DROP POLICY IF EXISTS "clients can read their coach profiles" ON public.profiles;

DROP POLICY IF EXISTS "coaches can update client profiles" ON public.profiles;
CREATE POLICY "coaches can update active client profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.coach_clients AS relation
    WHERE relation.coach_id = auth.uid()
      AND relation.client_id = profiles.id
      AND relation.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.coach_clients AS relation
    WHERE relation.coach_id = auth.uid()
      AND relation.client_id = profiles.id
      AND relation.status = 'active'
  )
);

DROP VIEW IF EXISTS public.active_related_profiles;
CREATE VIEW public.active_related_profiles
WITH (security_barrier = true)
AS
SELECT
  profile.id,
  profile.email,
  profile.full_name,
  profile.avatar_url,
  profile.phone,
  profile.birth_date,
  profile.gender,
  profile.height,
  profile.current_weight,
  profile.start_weight,
  profile.target_weight,
  profile.body_fat_pct,
  profile.objective,
  profile.activity_level,
  profile.calorie_goal,
  profile.protein_goal,
  profile.carbs_goal,
  profile.fat_goal,
  profile.tdee,
  profile.dietary_type,
  profile.allergies,
  profile.liked_foods,
  profile.meal_preferences,
  profile.status,
  profile.created_at,
  profile.coach_speciality,
  profile.coach_experience_years,
  profile.coach_monthly_rate,
  profile.subscription_type
FROM public.profiles AS profile
WHERE EXISTS (
  SELECT 1
  FROM public.coach_clients AS relation
  WHERE relation.status = 'active'
    AND (
      (relation.coach_id = auth.uid() AND relation.client_id = profile.id)
      OR
      (relation.client_id = auth.uid() AND relation.coach_id = profile.id)
    )
);

REVOKE ALL ON public.active_related_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.active_related_profiles TO authenticated, service_role;

COMMENT ON VIEW public.active_related_profiles IS
  'Projected profiles visible only across an active coach_clients relationship. Excludes role, Stripe, subscription authority, trial and internal scheduling fields.';

CREATE OR REPLACE FUNCTION public.update_active_client_profile(
  target_client_id uuid,
  changes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated public.profiles%ROWTYPE;
  unexpected_key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT key INTO unexpected_key
  FROM jsonb_object_keys(COALESCE(changes, '{}'::jsonb)) AS key
  WHERE key NOT IN (
    'full_name', 'phone', 'birth_date', 'gender', 'current_weight',
    'height', 'target_weight', 'body_fat_pct', 'objective', 'calorie_goal'
  )
  LIMIT 1;

  IF unexpected_key IS NOT NULL THEN
    RAISE EXCEPTION 'PROFILE_FIELD_NOT_COACH_EDITABLE: %', unexpected_key
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.coach_clients AS relation
    WHERE relation.coach_id = auth.uid()
      AND relation.client_id = target_client_id
      AND relation.status = 'active'
  ) THEN
    RAISE EXCEPTION 'ACTIVE_COACH_RELATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles AS profile
  SET
    full_name = CASE WHEN changes ? 'full_name' THEN changes->>'full_name' ELSE profile.full_name END,
    phone = CASE WHEN changes ? 'phone' THEN changes->>'phone' ELSE profile.phone END,
    birth_date = CASE WHEN changes ? 'birth_date' AND changes->>'birth_date' IS NOT NULL THEN (changes->>'birth_date')::date WHEN changes ? 'birth_date' THEN NULL ELSE profile.birth_date END,
    gender = CASE WHEN changes ? 'gender' THEN changes->>'gender' ELSE profile.gender END,
    current_weight = CASE WHEN changes ? 'current_weight' AND changes->>'current_weight' IS NOT NULL THEN (changes->>'current_weight')::numeric WHEN changes ? 'current_weight' THEN NULL ELSE profile.current_weight END,
    height = CASE WHEN changes ? 'height' AND changes->>'height' IS NOT NULL THEN (changes->>'height')::numeric WHEN changes ? 'height' THEN NULL ELSE profile.height END,
    target_weight = CASE WHEN changes ? 'target_weight' AND changes->>'target_weight' IS NOT NULL THEN (changes->>'target_weight')::numeric WHEN changes ? 'target_weight' THEN NULL ELSE profile.target_weight END,
    body_fat_pct = CASE WHEN changes ? 'body_fat_pct' AND changes->>'body_fat_pct' IS NOT NULL THEN (changes->>'body_fat_pct')::numeric WHEN changes ? 'body_fat_pct' THEN NULL ELSE profile.body_fat_pct END,
    objective = CASE WHEN changes ? 'objective' THEN changes->>'objective' ELSE profile.objective END,
    calorie_goal = CASE WHEN changes ? 'calorie_goal' AND changes->>'calorie_goal' IS NOT NULL THEN (changes->>'calorie_goal')::integer WHEN changes ? 'calorie_goal' THEN NULL ELSE profile.calorie_goal END
  WHERE profile.id = target_client_id
  RETURNING profile.* INTO updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLIENT_PROFILE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'id', updated.id,
    'full_name', updated.full_name,
    'phone', updated.phone,
    'birth_date', updated.birth_date,
    'gender', updated.gender,
    'current_weight', updated.current_weight,
    'height', updated.height,
    'target_weight', updated.target_weight,
    'body_fat_pct', updated.body_fat_pct,
    'objective', updated.objective,
    'calorie_goal', updated.calorie_goal
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_active_client_profile(uuid, jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_active_client_profile(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.update_active_client_profile(uuid, jsonb) IS
  'Updates only explicitly coach-editable profile fields when the caller has an active coach_clients relation.';
