BEGIN;

-- Permanent relation security requires both the canonical lifecycle writer and
-- an account-deletion RPC that cannot resolve caller-controlled temporary
-- objects. The temporary writer lock intentionally remains in place here.
DO $preflight$
DECLARE
  delete_account_owner text;
  writer_lock_before boolean;
BEGIN
  IF to_regclass('public.coach_clients') IS NULL
    OR to_regclass('public.profiles') IS NULL
  THEN
    RAISE EXCEPTION 'RELATION_DML_HARDENING_REQUIRED_TABLE_MISSING';
  END IF;

  IF to_regprocedure('public.delete_user_account(uuid)') IS NULL
    OR to_regprocedure(
      'public.transition_coach_client_relation(uuid,uuid,text,text,uuid,text)'
    ) IS NULL
    OR to_regprocedure('public.consume_coach_invitation_v2(bytea)') IS NULL
  THEN
    RAISE EXCEPTION 'RELATION_DML_HARDENING_REQUIRED_FUNCTION_MISSING';
  END IF;

  SELECT owner.rolname
  INTO delete_account_owner
  FROM pg_catalog.pg_proc AS routine
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = routine.pronamespace
  JOIN pg_catalog.pg_roles AS owner
    ON owner.oid = routine.proowner
  WHERE namespace.nspname = 'public'
    AND routine.proname = 'delete_user_account'
    AND pg_catalog.pg_get_function_identity_arguments(routine.oid)
      = 'target_user_id uuid';

  IF delete_account_owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'DELETE_USER_ACCOUNT_OWNER_INVALID: %',
      delete_account_owner;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS constraint_definition
    WHERE constraint_definition.conrelid = 'public.coach_clients'::regclass
      AND constraint_definition.contype = 'f'
      AND constraint_definition.confrelid = 'public.profiles'::regclass
      AND constraint_definition.confdeltype = 'c'
      AND constraint_definition.conkey = ARRAY[
        (
          SELECT attribute.attnum
          FROM pg_catalog.pg_attribute AS attribute
          WHERE attribute.attrelid = 'public.coach_clients'::regclass
            AND attribute.attname = 'client_id'
        )
      ]::smallint[]
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS constraint_definition
    WHERE constraint_definition.conrelid = 'public.coach_clients'::regclass
      AND constraint_definition.contype = 'f'
      AND constraint_definition.confrelid = 'public.profiles'::regclass
      AND constraint_definition.confdeltype = 'c'
      AND constraint_definition.conkey = ARRAY[
        (
          SELECT attribute.attnum
          FROM pg_catalog.pg_attribute AS attribute
          WHERE attribute.attrelid = 'public.coach_clients'::regclass
            AND attribute.attname = 'coach_id'
        )
      ]::smallint[]
  ) THEN
    RAISE EXCEPTION 'COACH_CLIENTS_PROFILE_CASCADE_CONTRACT_INVALID';
  END IF;

  SELECT
    to_regprocedure('public.rc1_guard_coach_clients_direct_write()')
      IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM pg_catalog.pg_trigger AS trigger_definition
      WHERE trigger_definition.tgrelid = 'public.coach_clients'::regclass
        AND trigger_definition.tgname =
          'rc1_guard_coach_clients_direct_write'
        AND trigger_definition.tgenabled = 'O'
        AND NOT trigger_definition.tgisinternal
    )
  INTO writer_lock_before;

  PERFORM pg_catalog.set_config(
    'moovx.writer_lock_before',
    writer_lock_before::text,
    true
  );
END
$preflight$;

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  caller_role text;
BEGIN
  SELECT profile.role
  INTO caller_role
  FROM public.profiles AS profile
  WHERE profile.id = auth.uid();

  IF auth.uid() IS NULL
    OR (
      auth.uid() <> target_user_id
      AND caller_role IS DISTINCT FROM 'super_admin'
    )
  THEN
    RAISE EXCEPTION 'Unauthorized: can only delete your own account'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.workout_sets WHERE user_id = target_user_id;
  DELETE FROM public.workout_sessions WHERE user_id = target_user_id;
  DELETE FROM public.cardio_sessions WHERE user_id = target_user_id;
  DELETE FROM public.completed_sessions
    WHERE client_id = target_user_id OR coach_id = target_user_id;
  DELETE FROM public.scheduled_sessions WHERE user_id = target_user_id;
  DELETE FROM public.workouts WHERE client_id = target_user_id;

  DELETE FROM public.daily_food_logs WHERE user_id = target_user_id;
  DELETE FROM public.meal_logs WHERE user_id = target_user_id;
  DELETE FROM public.meal_tracking WHERE user_id = target_user_id;
  DELETE FROM public.water_intake WHERE user_id = target_user_id;
  DELETE FROM public.saved_meals WHERE user_id = target_user_id;
  DELETE FROM public.nutrition WHERE client_id = target_user_id;

  DELETE FROM public.body_measurements WHERE user_id = target_user_id;
  DELETE FROM public.body_analyses WHERE user_id = target_user_id;
  DELETE FROM public.body_assessments WHERE user_id = target_user_id;
  DELETE FROM public.weight_logs WHERE user_id = target_user_id;
  DELETE FROM public.progress_photos WHERE user_id = target_user_id;

  DELETE FROM public.daily_checkins WHERE user_id = target_user_id;
  DELETE FROM public.daily_habits WHERE user_id = target_user_id;
  DELETE FROM public.user_achievements WHERE user_id = target_user_id;
  DELETE FROM public.user_badges WHERE user_id = target_user_id;
  DELETE FROM public.user_xp WHERE user_id = target_user_id;
  DELETE FROM public.personal_records WHERE user_id = target_user_id;
  DELETE FROM public.progressive_overload_suggestions
    WHERE user_id = target_user_id;
  DELETE FROM public.custom_exercises WHERE user_id = target_user_id;
  DELETE FROM public.custom_foods WHERE user_id = target_user_id;
  DELETE FROM public.custom_programs WHERE user_id = target_user_id;
  DELETE FROM public.exercise_feedback
    WHERE client_id = target_user_id OR coach_id = target_user_id;

  DELETE FROM public.ai_usage_logs WHERE user_id = target_user_id;
  DELETE FROM public.chat_ai_messages WHERE user_id = target_user_id;
  DELETE FROM public.app_logs WHERE user_id = target_user_id;
  DELETE FROM public.bug_reports WHERE user_id = target_user_id;
  DELETE FROM public.weekly_diagnostics WHERE user_id = target_user_id;

  DELETE FROM public.client_meal_plans
    WHERE client_id = target_user_id OR coach_id = target_user_id;
  DELETE FROM public.client_programs
    WHERE client_id = target_user_id OR coach_id = target_user_id;
  DELETE FROM public.meal_plans
    WHERE user_id = target_user_id OR created_by = target_user_id;
  DELETE FROM public.user_programs WHERE user_id = target_user_id;
  DELETE FROM public.activity_feed
    WHERE user_id = target_user_id OR coach_id = target_user_id;
  DELETE FROM public.coach_notes
    WHERE client_id = target_user_id OR coach_id = target_user_id;
  DELETE FROM public.commissions WHERE coach_id = target_user_id;

  UPDATE public.training_programs
  SET coach_id = NULL, created_by = NULL
  WHERE created_by = target_user_id AND is_template = true;

  DELETE FROM public.training_programs
  WHERE created_by = target_user_id
    AND (is_template IS NULL OR is_template = false);

  UPDATE public.community_foods
  SET created_by = NULL
  WHERE created_by = target_user_id;

  UPDATE public.exercises_db
  SET created_by = NULL
  WHERE created_by = target_user_id;

  UPDATE public.recipes
  SET user_id = NULL
  WHERE user_id = target_user_id AND is_public = true;

  DELETE FROM public.recipes
  WHERE user_id = target_user_id
    AND (is_public IS NULL OR is_public = false);

  DELETE FROM public.messages WHERE sender_id = target_user_id;
  UPDATE public.messages
  SET receiver_id = NULL
  WHERE receiver_id = target_user_id;

  DELETE FROM public.payments
  WHERE client_id = target_user_id OR coach_id = target_user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = target_user_id;

  -- coach_clients is intentionally not deleted directly. Both party foreign
  -- keys cascade from this final profile deletion.
  DELETE FROM public.profiles WHERE id = target_user_id;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'deleted_at', pg_catalog.now()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Delete failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$function$;

ALTER FUNCTION public.delete_user_account(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.delete_user_account(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid)
  TO authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.coach_clients
  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.coach_clients
  FROM service_role;

DO $postflight$
DECLARE
  delete_account_definition text;
  delete_account_owner text;
  privilege_name text;
  writer_lock_after boolean;
BEGIN
  IF NOT pg_catalog.has_table_privilege(
    'authenticated', 'public.coach_clients', 'SELECT'
  ) OR NOT pg_catalog.has_table_privilege(
    'service_role', 'public.coach_clients', 'SELECT'
  ) THEN
    RAISE EXCEPTION 'COACH_CLIENTS_REQUIRED_SELECT_GRANT_MISSING';
  END IF;

  FOREACH privilege_name IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE']
  LOOP
    IF pg_catalog.has_table_privilege(
      'authenticated', 'public.coach_clients', privilege_name
    ) THEN
      RAISE EXCEPTION 'AUTHENTICATED_COACH_CLIENTS_DML_GRANT_REMAINS: %',
        privilege_name;
    END IF;
  END LOOP;

  FOREACH privilege_name IN ARRAY ARRAY[
    'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
  ]
  LOOP
    IF pg_catalog.has_table_privilege(
      'service_role', 'public.coach_clients', privilege_name
    ) THEN
      RAISE EXCEPTION 'SERVICE_ROLE_COACH_CLIENTS_PRIVILEGE_REMAINS: %',
        privilege_name;
    END IF;
  END LOOP;

  FOREACH privilege_name IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE']
  LOOP
    IF pg_catalog.has_table_privilege(
      'anon', 'public.coach_clients', privilege_name
    ) THEN
      RAISE EXCEPTION 'PUBLIC_OR_ANON_COACH_CLIENTS_DML_GRANT_REMAINS: %',
        privilege_name;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      coalesce(
        relation.relacl,
        pg_catalog.acldefault('r', relation.relowner)
      )
    ) AS privilege
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'coach_clients'
      AND privilege.grantee = 0
      AND privilege.privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'PUBLIC_COACH_CLIENTS_DML_GRANT_REMAINS';
  END IF;

  IF current_setting('server_version_num')::integer >= 170000
    AND pg_catalog.has_table_privilege(
      'service_role', 'public.coach_clients', 'MAINTAIN'
    )
  THEN
    RAISE EXCEPTION 'SERVICE_ROLE_COACH_CLIENTS_MAINTAIN_GRANT_REMAINS';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(routine.oid), owner.rolname
  INTO delete_account_definition, delete_account_owner
  FROM pg_catalog.pg_proc AS routine
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.oid = routine.pronamespace
  JOIN pg_catalog.pg_roles AS owner
    ON owner.oid = routine.proowner
  WHERE namespace.nspname = 'public'
    AND routine.proname = 'delete_user_account'
    AND pg_catalog.pg_get_function_identity_arguments(routine.oid)
      = 'target_user_id uuid';

  IF delete_account_owner IS DISTINCT FROM 'postgres'
    OR delete_account_definition NOT LIKE '%SECURITY DEFINER%'
    OR delete_account_definition NOT LIKE '%SET search_path TO ''''%'
    OR delete_account_definition LIKE '%DELETE FROM public.coach_clients%'
  THEN
    RAISE EXCEPTION 'DELETE_USER_ACCOUNT_HARDENING_INVALID';
  END IF;

  IF pg_catalog.has_function_privilege(
    'anon', 'public.delete_user_account(uuid)', 'EXECUTE'
  ) OR NOT pg_catalog.has_function_privilege(
    'authenticated', 'public.delete_user_account(uuid)', 'EXECUTE'
  ) OR NOT pg_catalog.has_function_privilege(
    'service_role', 'public.delete_user_account(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'DELETE_USER_ACCOUNT_EXECUTE_GRANTS_INVALID';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS routine
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = routine.pronamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      coalesce(
        routine.proacl,
        pg_catalog.acldefault('f', routine.proowner)
      )
    ) AS privilege
    WHERE namespace.nspname = 'public'
      AND routine.proname = 'delete_user_account'
      AND pg_catalog.pg_get_function_identity_arguments(routine.oid)
        = 'target_user_id uuid'
      AND privilege.grantee = 0
      AND privilege.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'DELETE_USER_ACCOUNT_PUBLIC_EXECUTE_REMAINS';
  END IF;

  SELECT
    to_regprocedure('public.rc1_guard_coach_clients_direct_write()')
      IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM pg_catalog.pg_trigger AS trigger_definition
      WHERE trigger_definition.tgrelid = 'public.coach_clients'::regclass
        AND trigger_definition.tgname =
          'rc1_guard_coach_clients_direct_write'
        AND trigger_definition.tgenabled = 'O'
        AND NOT trigger_definition.tgisinternal
    )
  INTO writer_lock_after;

  IF writer_lock_after IS DISTINCT FROM pg_catalog.current_setting(
    'moovx.writer_lock_before'
  )::boolean THEN
    RAISE EXCEPTION 'TEMPORARY_COACH_CLIENTS_WRITER_LOCK_STATE_CHANGED';
  END IF;
END
$postflight$;

COMMIT;
