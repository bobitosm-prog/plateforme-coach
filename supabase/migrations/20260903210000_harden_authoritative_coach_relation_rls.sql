BEGIN;

-- From this migration onward, "active" in the historical helper name means
-- active AND explicitly authoritative. Physical lifecycle operations continue
-- to use coach_clients.status directly in the canonical writer.
DO $preflight$
BEGIN
  IF to_regclass('public.coach_clients') IS NULL THEN
    RAISE EXCEPTION 'AUTHORITATIVE_RELATION_RLS_REQUIRES_COACH_CLIENTS';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coach_clients'
      AND column_name = 'source'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'AUTHORITATIVE_RELATION_RLS_REQUIRES_SOURCE';
  END IF;

  IF to_regprocedure('public.is_active_coach_client_relation(uuid,uuid)') IS NULL
    OR to_regprocedure('public.is_active_messaging_pair(uuid,uuid)') IS NULL
  THEN
    RAISE EXCEPTION 'AUTHORITATIVE_RELATION_RLS_REQUIRES_EXISTING_HELPERS';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.is_active_coach_client_relation(
  coach_uuid uuid,
  client_uuid uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_clients AS relation
    WHERE relation.coach_id = coach_uuid
      AND relation.client_id = client_uuid
      AND relation.status = 'active'
      AND relation.source IN ('invitation', 'admin')
  );
$function$;

REVOKE ALL ON FUNCTION public.is_active_coach_client_relation(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_coach_client_relation(uuid, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.is_active_coach_client_relation(uuid, uuid) IS
  'True only for an active authoritative coach/client relation sourced from an explicit invitation or audited admin workflow.';

-- Retire every surviving browser policy that treats a physical
-- coach_clients row as authority. Participant reads on coach_clients remain,
-- while lifecycle writes continue exclusively through the canonical writer.
DROP POLICY IF EXISTS "body_analyses_coach_read" ON public.body_analyses;
DROP POLICY IF EXISTS "coaches can read their clients profiles" ON public.profiles;
DROP POLICY IF EXISTS "program_days_coach_all" ON public.program_days;
DROP POLICY IF EXISTS "program_exercises_coach_all" ON public.program_exercises;
DROP POLICY IF EXISTS "program days visible" ON public.program_days;
DROP POLICY IF EXISTS "program exercises visible" ON public.program_exercises;
DROP POLICY IF EXISTS "user_badges_coach_read" ON public.user_badges;
DROP POLICY IF EXISTS "user_xp_coach_read" ON public.user_xp;
DROP POLICY IF EXISTS "coaches manage meal plans" ON public.client_meal_plans;
DROP POLICY IF EXISTS "coach clients" ON public.coach_clients;
DROP POLICY IF EXISTS "coach_clients_manage" ON public.coach_clients;
DROP POLICY IF EXISTS "coach_clients_self_insert_safe" ON public.coach_clients;
DROP POLICY IF EXISTS "program_days_coach_select_active" ON public.program_days;
DROP POLICY IF EXISTS "program_days_coach_insert_active" ON public.program_days;
DROP POLICY IF EXISTS "program_days_coach_update_active" ON public.program_days;
DROP POLICY IF EXISTS "program_days_coach_delete_active" ON public.program_days;
DROP POLICY IF EXISTS "program_exercises_coach_select_active" ON public.program_exercises;
DROP POLICY IF EXISTS "program_exercises_coach_insert_active" ON public.program_exercises;
DROP POLICY IF EXISTS "program_exercises_coach_update_active" ON public.program_exercises;
DROP POLICY IF EXISTS "program_exercises_coach_delete_active" ON public.program_exercises;

CREATE POLICY "body_analyses_coach_read"
ON public.body_analyses
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), body_analyses.user_id)
);

CREATE POLICY "program_days_coach_select_active"
ON public.program_days
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.custom_programs AS program
    WHERE program.id = program_days.program_id
      AND public.is_active_coach_client_relation(
        auth.uid(),
        program.user_id
      )
  )
);

CREATE POLICY "program_days_coach_insert_active"
ON public.program_days
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.custom_programs AS program
    WHERE program.id = program_days.program_id
      AND public.is_active_coach_client_relation(
        auth.uid(),
        program.user_id
      )
  )
);

CREATE POLICY "program_days_coach_update_active"
ON public.program_days
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.custom_programs AS program
    WHERE program.id = program_days.program_id
      AND public.is_active_coach_client_relation(
        auth.uid(),
        program.user_id
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.custom_programs AS program
    WHERE program.id = program_days.program_id
      AND public.is_active_coach_client_relation(
        auth.uid(),
        program.user_id
      )
  )
);

CREATE POLICY "program_days_coach_delete_active"
ON public.program_days
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.custom_programs AS program
    WHERE program.id = program_days.program_id
      AND public.is_active_coach_client_relation(
        auth.uid(),
        program.user_id
      )
  )
);

CREATE POLICY "program_exercises_coach_select_active"
ON public.program_exercises
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.program_days AS day
    JOIN public.custom_programs AS program ON program.id = day.program_id
    WHERE day.id = program_exercises.program_day_id
      AND public.is_active_coach_client_relation(
        auth.uid(),
        program.user_id
      )
  )
);

CREATE POLICY "program_exercises_coach_insert_active"
ON public.program_exercises
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.program_days AS day
    JOIN public.custom_programs AS program ON program.id = day.program_id
    WHERE day.id = program_exercises.program_day_id
      AND public.is_active_coach_client_relation(
        auth.uid(),
        program.user_id
      )
  )
);

CREATE POLICY "program_exercises_coach_update_active"
ON public.program_exercises
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.program_days AS day
    JOIN public.custom_programs AS program ON program.id = day.program_id
    WHERE day.id = program_exercises.program_day_id
      AND public.is_active_coach_client_relation(
        auth.uid(),
        program.user_id
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.program_days AS day
    JOIN public.custom_programs AS program ON program.id = day.program_id
    WHERE day.id = program_exercises.program_day_id
      AND public.is_active_coach_client_relation(
        auth.uid(),
        program.user_id
      )
  )
);

CREATE POLICY "program_exercises_coach_delete_active"
ON public.program_exercises
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.program_days AS day
    JOIN public.custom_programs AS program ON program.id = day.program_id
    WHERE day.id = program_exercises.program_day_id
      AND public.is_active_coach_client_relation(
        auth.uid(),
        program.user_id
      )
  )
);

CREATE POLICY "user_badges_coach_read"
ON public.user_badges
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), user_badges.user_id)
);

CREATE POLICY "user_xp_coach_read"
ON public.user_xp
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), user_xp.user_id)
);

DO $postflight$
DECLARE
  helper_definition text;
  protected_policy_count integer;
  unsafe_direct_policy_count integer;
  unrestricted_sensitive_policy_count integer;
  browser_relation_write_count integer;
BEGIN
  SELECT pg_get_functiondef(
    'public.is_active_coach_client_relation(uuid,uuid)'::regprocedure
  ) INTO helper_definition;

  IF helper_definition NOT LIKE '%relation.status = ''active''%'
    OR helper_definition NOT LIKE '%relation.source IN (''invitation'', ''admin'')%'
  THEN
    RAISE EXCEPTION 'AUTHORITATIVE_RELATION_HELPER_INVALID';
  END IF;

  SELECT count(*)
  INTO protected_policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND (tablename, policyname, cmd) IN (
      ('profiles', 'coaches can update active client profiles', 'UPDATE'),
      ('profiles', 'profiles_coach_select_active_client', 'SELECT'),
      ('profiles', 'profiles_client_select_active_coach', 'SELECT'),
      ('progress_photos', 'progress_photos_coach_read', 'SELECT'),
      ('body_measurements', 'body_measurements_coach_read', 'SELECT'),
      ('weight_logs', 'weight_logs_coach_read', 'SELECT'),
      ('daily_checkins', 'daily_checkins_coach_read', 'SELECT'),
      ('personal_records', 'personal_records_coach_read', 'SELECT'),
      ('daily_food_logs', 'daily_food_logs_coach_read', 'SELECT'),
      ('meal_logs', 'meal_logs_coach_read', 'SELECT'),
      ('meal_tracking', 'meal_tracking_coach_read', 'SELECT'),
      ('meal_plans', 'meal_plans_coach_select_active', 'SELECT'),
      ('meal_plans', 'meal_plans_coach_insert_active', 'INSERT'),
      ('meal_plans', 'meal_plans_coach_update_active', 'UPDATE'),
      ('meal_plans', 'meal_plans_coach_delete_active', 'DELETE'),
      ('client_meal_plans', 'client_meal_plans_coach_select_active', 'SELECT'),
      ('client_meal_plans', 'client_meal_plans_coach_insert_active', 'INSERT'),
      ('client_meal_plans', 'client_meal_plans_coach_update_active', 'UPDATE'),
      ('client_meal_plans', 'client_meal_plans_coach_delete_active', 'DELETE'),
      ('workout_sessions', 'workout_sessions_coach_read', 'SELECT'),
      ('workout_sets', 'workout_sets_coach_read', 'SELECT'),
      ('custom_programs', 'custom_programs_coach_read', 'SELECT'),
      ('custom_programs', 'custom_programs_coach_insert', 'INSERT'),
      ('custom_programs', 'custom_programs_coach_update', 'UPDATE'),
      ('custom_programs', 'custom_programs_coach_delete', 'DELETE'),
      ('client_programs', 'client_programs_coach_select_active', 'SELECT'),
      ('client_programs', 'client_programs_coach_insert_active', 'INSERT'),
      ('client_programs', 'client_programs_coach_update_active', 'UPDATE'),
      ('client_programs', 'client_programs_coach_delete_active', 'DELETE'),
      ('completed_sessions', 'completed_sessions_coach_read', 'SELECT'),
      ('exercise_feedback', 'exercise_feedback_coach_select_active', 'SELECT'),
      ('exercise_feedback', 'exercise_feedback_coach_update_active', 'UPDATE'),
      ('scheduled_sessions', 'scheduled_sessions_coach_select_active', 'SELECT'),
      ('scheduled_sessions', 'scheduled_sessions_coach_insert_active', 'INSERT'),
      ('scheduled_sessions', 'scheduled_sessions_coach_update_active', 'UPDATE'),
      ('scheduled_sessions', 'scheduled_sessions_coach_delete_active', 'DELETE'),
      ('messages', 'messages_select_active_participants', 'SELECT'),
      ('messages', 'messages_insert_active_participants', 'INSERT'),
      ('messages', 'messages_update_read_active_recipient', 'UPDATE'),
      ('coach_notes', 'coach_notes_coach_select_active', 'SELECT'),
      ('coach_notes', 'coach_notes_coach_insert_active', 'INSERT'),
      ('coach_notes', 'coach_notes_coach_update_active', 'UPDATE'),
      ('coach_appointments', 'coach_appointments_coach_select_active', 'SELECT'),
      ('coach_appointments', 'coach_appointments_coach_insert_active', 'INSERT'),
      ('coach_appointments', 'coach_appointments_coach_update_active', 'UPDATE'),
      ('coach_appointments', 'coach_appointments_coach_delete_active', 'DELETE'),
      ('activity_feed', 'activity_feed_own', 'SELECT'),
      ('activity_feed', 'activity_feed_insert', 'INSERT'),
      ('payments', 'payments_coach_select_active_clients', 'SELECT'),
      ('body_analyses', 'body_analyses_coach_read', 'SELECT'),
      ('program_days', 'program_days_coach_select_active', 'SELECT'),
      ('program_days', 'program_days_coach_insert_active', 'INSERT'),
      ('program_days', 'program_days_coach_update_active', 'UPDATE'),
      ('program_days', 'program_days_coach_delete_active', 'DELETE'),
      ('program_exercises', 'program_exercises_coach_select_active', 'SELECT'),
      ('program_exercises', 'program_exercises_coach_insert_active', 'INSERT'),
      ('program_exercises', 'program_exercises_coach_update_active', 'UPDATE'),
      ('program_exercises', 'program_exercises_coach_delete_active', 'DELETE'),
      ('user_badges', 'user_badges_coach_read', 'SELECT'),
      ('user_xp', 'user_xp_coach_read', 'SELECT')
    )
    AND (
      coalesce(qual, '') LIKE '%is_active_coach_client_relation%'
      OR coalesce(with_check, '') LIKE '%is_active_coach_client_relation%'
      OR coalesce(qual, '') LIKE '%is_active_messaging_pair%'
      OR coalesce(with_check, '') LIKE '%is_active_messaging_pair%'
    );

  IF protected_policy_count <> 60 THEN
    RAISE EXCEPTION 'AUTHORITATIVE_RELATION_POLICIES_INCOMPLETE: %',
      protected_policy_count;
  END IF;

  WITH client_data_tables AS (
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('client_id', 'user_id')
  )
  SELECT count(*)
  INTO unsafe_direct_policy_count
  FROM pg_catalog.pg_policies AS policy
  WHERE policy.schemaname = 'public'
    AND (
      (
        coalesce(policy.qual, '') LIKE '%coach_clients%'
        OR coalesce(policy.with_check, '') LIKE '%coach_clients%'
      )
      OR (
        (
          coalesce(policy.qual, '')
            ~* '(auth\.uid\(\).{0,120}coach_id|coach_id.{0,120}auth\.uid\(\))'
          OR coalesce(policy.with_check, '')
            ~* '(auth\.uid\(\).{0,120}coach_id|coach_id.{0,120}auth\.uid\(\))'
        )
        AND coalesce(policy.qual, '')
          NOT LIKE '%is_active_coach_client_relation%'
        AND coalesce(policy.with_check, '')
          NOT LIKE '%is_active_coach_client_relation%'
        AND coalesce(policy.qual, '') NOT LIKE '%is_active_messaging_pair%'
        AND coalesce(policy.with_check, '') NOT LIKE '%is_active_messaging_pair%'
        AND policy.tablename IN (SELECT table_name FROM client_data_tables)
        AND NOT (
          policy.tablename = 'coach_clients'
          AND policy.cmd = 'SELECT'
        )
      )
    );

  IF unsafe_direct_policy_count <> 0 THEN
    RAISE EXCEPTION 'AUTHORITATIVE_DIRECT_COACH_BYPASS_REMAINS: %',
      unsafe_direct_policy_count;
  END IF;

  WITH helper_scoped_tables AS (
    SELECT DISTINCT tablename
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') LIKE '%is_active_coach_client_relation%'
        OR coalesce(with_check, '') LIKE '%is_active_coach_client_relation%'
        OR coalesce(qual, '') LIKE '%is_active_messaging_pair%'
        OR coalesce(with_check, '') LIKE '%is_active_messaging_pair%'
      )
  )
  SELECT count(*)
  INTO unrestricted_sensitive_policy_count
  FROM pg_catalog.pg_policies AS policy
  JOIN helper_scoped_tables USING (tablename)
  WHERE policy.schemaname = 'public'
    AND (
      lower(btrim(coalesce(policy.qual, ''))) = 'true'
      OR lower(btrim(coalesce(policy.with_check, ''))) = 'true'
    );

  IF unrestricted_sensitive_policy_count <> 0 THEN
    RAISE EXCEPTION 'AUTHORITATIVE_UNRESTRICTED_SENSITIVE_POLICY_REMAINS: %',
      unrestricted_sensitive_policy_count;
  END IF;

  SELECT count(*)
  INTO browser_relation_write_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'coach_clients'
    AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE');

  IF browser_relation_write_count <> 0 THEN
    RAISE EXCEPTION 'AUTHORITATIVE_BROWSER_RELATION_WRITER_REMAINS: %',
      browser_relation_write_count;
  END IF;

  IF has_function_privilege(
    'anon',
    'public.is_active_coach_client_relation(uuid,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'ANON_AUTHORITATIVE_RELATION_HELPER_EXECUTE_REMAINS';
  END IF;
END
$postflight$;

COMMIT;
