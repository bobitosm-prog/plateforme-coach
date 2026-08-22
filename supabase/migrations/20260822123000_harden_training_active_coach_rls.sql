BEGIN;

DO $preflight$
DECLARE
  target_table text;
BEGIN
  IF to_regprocedure(
    'public.is_active_coach_client_relation(uuid,uuid)'
  ) IS NULL THEN
    RAISE EXCEPTION 'TRAINING_RLS_REQUIRES_ACTIVE_RELATION_HELPER';
  END IF;

  FOREACH target_table IN ARRAY ARRAY[
    'workout_sessions',
    'workout_sets',
    'custom_programs',
    'client_programs',
    'completed_sessions',
    'exercise_feedback',
    'scheduled_sessions'
  ]
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NULL THEN
      RAISE EXCEPTION 'TRAINING_RLS_REQUIRES_TABLE: %', target_table;
    END IF;
  END LOOP;
END
$preflight$;

-- workout_sessions.user_id and workout_sets.user_id are direct, foreign-keyed
-- client identities populated by the runtime. Existing owner policies remain.
DROP POLICY IF EXISTS "workout_sessions_coach_read"
  ON public.workout_sessions;
CREATE POLICY "workout_sessions_coach_read"
ON public.workout_sessions
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), workout_sessions.user_id)
);

DROP POLICY IF EXISTS "workout_sets_coach_read"
  ON public.workout_sets;
CREATE POLICY "workout_sets_coach_read"
ON public.workout_sets
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), workout_sets.user_id)
);

DROP POLICY IF EXISTS "custom_programs_coach_read"
  ON public.custom_programs;
CREATE POLICY "custom_programs_coach_read"
ON public.custom_programs
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), custom_programs.user_id)
);

DROP POLICY IF EXISTS "custom_programs_coach_insert"
  ON public.custom_programs;
CREATE POLICY "custom_programs_coach_insert"
ON public.custom_programs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_coach_client_relation(auth.uid(), custom_programs.user_id)
);

DROP POLICY IF EXISTS "custom_programs_coach_update"
  ON public.custom_programs;
CREATE POLICY "custom_programs_coach_update"
ON public.custom_programs
FOR UPDATE
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), custom_programs.user_id)
)
WITH CHECK (
  public.is_active_coach_client_relation(auth.uid(), custom_programs.user_id)
);

DROP POLICY IF EXISTS "custom_programs_coach_delete"
  ON public.custom_programs;
CREATE POLICY "custom_programs_coach_delete"
ON public.custom_programs
FOR DELETE
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), custom_programs.user_id)
);

-- Replace duplicate FOR ALL policies. Current coaches may read historical rows
-- for their active clients; mutations remain limited to rows declaring them.
DROP POLICY IF EXISTS "client_programs_coach_all"
  ON public.client_programs;
DROP POLICY IF EXISTS "client_programs_coach_write"
  ON public.client_programs;

DROP POLICY IF EXISTS "client_programs_coach_select_active"
  ON public.client_programs;
CREATE POLICY "client_programs_coach_select_active"
ON public.client_programs
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), client_programs.client_id)
);

DROP POLICY IF EXISTS "client_programs_coach_insert_active"
  ON public.client_programs;
CREATE POLICY "client_programs_coach_insert_active"
ON public.client_programs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = client_programs.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    client_programs.client_id
  )
);

DROP POLICY IF EXISTS "client_programs_coach_update_active"
  ON public.client_programs;
CREATE POLICY "client_programs_coach_update_active"
ON public.client_programs
FOR UPDATE
TO authenticated
USING (
  auth.uid() = client_programs.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    client_programs.client_id
  )
)
WITH CHECK (
  auth.uid() = client_programs.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    client_programs.client_id
  )
);

DROP POLICY IF EXISTS "client_programs_coach_delete_active"
  ON public.client_programs;
CREATE POLICY "client_programs_coach_delete_active"
ON public.client_programs
FOR DELETE
TO authenticated
USING (
  auth.uid() = client_programs.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    client_programs.client_id
  )
);

-- completed_sessions.client_id is the immutable client authority. coach_id is
-- historical attribution and cannot independently retain read access.
DROP POLICY IF EXISTS "completed_sessions_coach_read"
  ON public.completed_sessions;
CREATE POLICY "completed_sessions_coach_read"
ON public.completed_sessions
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), completed_sessions.client_id)
);

-- Clients create their own feedback through the existing owner policy. Coaches
-- only read and review feedback, and updates remain row-coach plus active-bound.
DROP POLICY IF EXISTS "exercise_feedback_coach"
  ON public.exercise_feedback;

DROP POLICY IF EXISTS "exercise_feedback_coach_select_active"
  ON public.exercise_feedback;
CREATE POLICY "exercise_feedback_coach_select_active"
ON public.exercise_feedback
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), exercise_feedback.client_id)
);

DROP POLICY IF EXISTS "exercise_feedback_coach_update_active"
  ON public.exercise_feedback;
CREATE POLICY "exercise_feedback_coach_update_active"
ON public.exercise_feedback
FOR UPDATE
TO authenticated
USING (
  auth.uid() = exercise_feedback.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    exercise_feedback.client_id
  )
)
WITH CHECK (
  auth.uid() = exercise_feedback.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    exercise_feedback.client_id
  )
);

-- client_id is authoritative for coach-managed scheduled rows. user_id remains
-- the authority for client-created rows through the existing owner policies.
DROP POLICY IF EXISTS "coaches manage scheduled sessions"
  ON public.scheduled_sessions;

DROP POLICY IF EXISTS "scheduled_sessions_coach_select_active"
  ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions_coach_select_active"
ON public.scheduled_sessions
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), scheduled_sessions.client_id)
);

DROP POLICY IF EXISTS "scheduled_sessions_coach_insert_active"
  ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions_coach_insert_active"
ON public.scheduled_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = scheduled_sessions.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    scheduled_sessions.client_id
  )
);

DROP POLICY IF EXISTS "scheduled_sessions_coach_update_active"
  ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions_coach_update_active"
ON public.scheduled_sessions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = scheduled_sessions.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    scheduled_sessions.client_id
  )
)
WITH CHECK (
  auth.uid() = scheduled_sessions.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    scheduled_sessions.client_id
  )
);

DROP POLICY IF EXISTS "scheduled_sessions_coach_delete_active"
  ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions_coach_delete_active"
ON public.scheduled_sessions
FOR DELETE
TO authenticated
USING (
  auth.uid() = scheduled_sessions.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    scheduled_sessions.client_id
  )
);

DO $postflight$
DECLARE
  required_policy_count integer;
BEGIN
  SELECT count(*)
  INTO required_policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND (tablename, policyname, cmd) IN (
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
      ('scheduled_sessions', 'scheduled_sessions_coach_delete_active', 'DELETE')
    )
    AND roles = ARRAY['authenticated']::name[]
    AND (
      coalesce(qual, '') LIKE '%is_active_coach_client_relation%'
      OR coalesce(with_check, '') LIKE '%is_active_coach_client_relation%'
    );

  IF required_policy_count <> 17 THEN
    RAISE EXCEPTION 'TRAINING_ACTIVE_COACH_POLICIES_INCOMPLETE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'workout_sessions',
        'workout_sets',
        'custom_programs',
        'client_programs',
        'completed_sessions',
        'exercise_feedback',
        'scheduled_sessions'
      )
      AND (
        coalesce(qual, '') LIKE '%coach_clients%'
        OR coalesce(with_check, '') LIKE '%coach_clients%'
        OR (
          (
            coalesce(qual, '') ~ 'auth\.uid\(\)\s*=\s*(?:[a-z_]+\.)?(?:coach_id|created_by)'
            OR coalesce(with_check, '') ~ 'auth\.uid\(\)\s*=\s*(?:[a-z_]+\.)?(?:coach_id|created_by)'
          )
          AND coalesce(qual, '') NOT LIKE '%is_active_coach_client_relation%'
          AND coalesce(with_check, '') NOT LIKE '%is_active_coach_client_relation%'
        )
      )
  ) THEN
    RAISE EXCEPTION 'TRAINING_LEGACY_COACH_BYPASS_REMAINS';
  END IF;
END
$postflight$;

COMMIT;
