BEGIN;

DO $preflight$
DECLARE
  target_table text;
  required_column record;
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

  FOR required_column IN
    SELECT *
    FROM (VALUES
      ('workout_sessions', 'user_id'),
      ('workout_sets', 'user_id'),
      ('custom_programs', 'user_id'),
      ('client_programs', 'client_id'),
      ('client_programs', 'coach_id'),
      ('completed_sessions', 'client_id'),
      ('exercise_feedback', 'client_id'),
      ('exercise_feedback', 'coach_id'),
      ('scheduled_sessions', 'user_id')
    ) AS required(table_name, column_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute
      WHERE attrelid = format(
        'public.%I',
        required_column.table_name
      )::regclass
        AND attname = required_column.column_name
        AND attnum > 0
        AND NOT attisdropped
    ) THEN
      RAISE EXCEPTION 'TRAINING_RLS_REQUIRES_COLUMN: %.%',
        required_column.table_name,
        required_column.column_name;
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
DROP POLICY IF EXISTS "coaches manage programs"
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
DROP POLICY IF EXISTS "Coaches manage client feedback"
  ON public.exercise_feedback;

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

-- scheduled_sessions stores client program calendar rows. user_id is its sole
-- client authority; coach appointments use the distinct coach_appointments
-- table. Active related coaches may manage a client's calendar without adding
-- legacy coach_id/client_id columns to this table.
DROP POLICY IF EXISTS "coaches manage scheduled sessions"
  ON public.scheduled_sessions;

DROP POLICY IF EXISTS "scheduled_sessions_coach_select_active"
  ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions_coach_select_active"
ON public.scheduled_sessions
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), scheduled_sessions.user_id)
);

DROP POLICY IF EXISTS "scheduled_sessions_coach_insert_active"
  ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions_coach_insert_active"
ON public.scheduled_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_active_coach_client_relation(
    auth.uid(),
    scheduled_sessions.user_id
  )
);

DROP POLICY IF EXISTS "scheduled_sessions_coach_update_active"
  ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions_coach_update_active"
ON public.scheduled_sessions
FOR UPDATE
TO authenticated
USING (
  public.is_active_coach_client_relation(
    auth.uid(),
    scheduled_sessions.user_id
  )
)
WITH CHECK (
  public.is_active_coach_client_relation(
    auth.uid(),
    scheduled_sessions.user_id
  )
);

DROP POLICY IF EXISTS "scheduled_sessions_coach_delete_active"
  ON public.scheduled_sessions;
CREATE POLICY "scheduled_sessions_coach_delete_active"
ON public.scheduled_sessions
FOR DELETE
TO authenticated
USING (
  public.is_active_coach_client_relation(
    auth.uid(),
    scheduled_sessions.user_id
  )
);

DO $postflight$
DECLARE
  required_policy_count integer;
  helper_policy_dependency_count integer;
  scope_helper_policy_dependency_count integer;
  scheduled_user_policy_dependency_count integer;
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

  SELECT count(DISTINCT policy.oid)
  INTO helper_policy_dependency_count
  FROM pg_catalog.pg_policy AS policy
  JOIN pg_catalog.pg_class AS target
    ON target.oid = policy.polrelid
  JOIN pg_catalog.pg_namespace AS target_schema
    ON target_schema.oid = target.relnamespace
  JOIN pg_catalog.pg_depend AS dependency
    ON dependency.classid = 'pg_policy'::regclass
    AND dependency.objid = policy.oid
  WHERE target_schema.nspname = 'public'
    AND (target.relname, policy.polname) IN (
      ('workout_sessions', 'workout_sessions_coach_read'),
      ('workout_sets', 'workout_sets_coach_read'),
      ('custom_programs', 'custom_programs_coach_read'),
      ('custom_programs', 'custom_programs_coach_insert'),
      ('custom_programs', 'custom_programs_coach_update'),
      ('custom_programs', 'custom_programs_coach_delete'),
      ('client_programs', 'client_programs_coach_select_active'),
      ('client_programs', 'client_programs_coach_insert_active'),
      ('client_programs', 'client_programs_coach_update_active'),
      ('client_programs', 'client_programs_coach_delete_active'),
      ('completed_sessions', 'completed_sessions_coach_read'),
      ('exercise_feedback', 'exercise_feedback_coach_select_active'),
      ('exercise_feedback', 'exercise_feedback_coach_update_active'),
      ('scheduled_sessions', 'scheduled_sessions_coach_select_active'),
      ('scheduled_sessions', 'scheduled_sessions_coach_insert_active'),
      ('scheduled_sessions', 'scheduled_sessions_coach_update_active'),
      ('scheduled_sessions', 'scheduled_sessions_coach_delete_active')
    )
    AND dependency.refclassid = 'pg_proc'::regclass
    AND dependency.refobjid =
      'public.is_active_coach_client_relation(uuid,uuid)'::regprocedure;

  IF helper_policy_dependency_count <> 17 THEN
    RAISE EXCEPTION 'TRAINING_ACTIVE_COACH_HELPER_DEPENDENCIES_INVALID';
  END IF;

  SELECT count(DISTINCT policy.oid)
  INTO scope_helper_policy_dependency_count
  FROM pg_catalog.pg_policy AS policy
  JOIN pg_catalog.pg_class AS target
    ON target.oid = policy.polrelid
  JOIN pg_catalog.pg_namespace AS target_schema
    ON target_schema.oid = target.relnamespace
  JOIN pg_catalog.pg_depend AS dependency
    ON dependency.classid = 'pg_policy'::regclass
    AND dependency.objid = policy.oid
  WHERE target_schema.nspname = 'public'
    AND target.relname IN (
      'workout_sessions',
      'workout_sets',
      'custom_programs',
      'client_programs',
      'completed_sessions',
      'exercise_feedback',
      'scheduled_sessions'
    )
    AND dependency.refclassid = 'pg_proc'::regclass
    AND dependency.refobjid =
      'public.is_active_coach_client_relation(uuid,uuid)'::regprocedure;

  IF scope_helper_policy_dependency_count <> 17 THEN
    RAISE EXCEPTION 'TRAINING_ACTIVE_COACH_POLICY_SET_INVALID';
  END IF;

  SELECT count(DISTINCT policy.oid)
  INTO scheduled_user_policy_dependency_count
  FROM pg_catalog.pg_policy AS policy
  JOIN pg_catalog.pg_depend AS dependency
    ON dependency.classid = 'pg_policy'::regclass
    AND dependency.objid = policy.oid
  JOIN pg_catalog.pg_attribute AS attribute
    ON attribute.attrelid = dependency.refobjid
    AND attribute.attnum = dependency.refobjsubid
  WHERE policy.polrelid = 'public.scheduled_sessions'::regclass
    AND policy.polname IN (
      'scheduled_sessions_coach_select_active',
      'scheduled_sessions_coach_insert_active',
      'scheduled_sessions_coach_update_active',
      'scheduled_sessions_coach_delete_active'
    )
    AND dependency.refclassid = 'pg_class'::regclass
    AND dependency.refobjid = 'public.scheduled_sessions'::regclass
    AND attribute.attname = 'user_id';

  IF scheduled_user_policy_dependency_count <> 4 THEN
    RAISE EXCEPTION 'SCHEDULED_SESSIONS_CLIENT_AUTHORITY_INVALID';
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
        lower(btrim(coalesce(qual, ''))) IN ('true', '(true)')
        OR lower(btrim(coalesce(with_check, ''))) IN ('true', '(true)')
      )
  ) THEN
    RAISE EXCEPTION 'TRAINING_UNRESTRICTED_POLICY_REMAINS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND (tablename, policyname) IN (
        ('client_programs', 'client_programs_coach_all'),
        ('client_programs', 'client_programs_coach_write'),
        ('client_programs', 'coaches manage programs'),
        ('exercise_feedback', 'Coaches manage client feedback'),
        ('exercise_feedback', 'exercise_feedback_coach')
      )
  ) THEN
    RAISE EXCEPTION 'TRAINING_NAMED_LEGACY_POLICY_REMAINS';
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
            OR coalesce(qual, '') ~ '(?:[a-z_]+\.)?(?:coach_id|created_by)\s*=\s*auth\.uid\(\)'
            OR coalesce(with_check, '') ~ '(?:[a-z_]+\.)?(?:coach_id|created_by)\s*=\s*auth\.uid\(\)'
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
