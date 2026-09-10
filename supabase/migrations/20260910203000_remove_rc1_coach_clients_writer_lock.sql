BEGIN;

-- The RC1 writer lock was a temporary second boundary while permanent table
-- grants and relation writers were being hardened. Remove it only after the
-- permanent M9/M10/M12/M14 contract is proven complete.
DO $preflight$
DECLARE
  guard_function oid := to_regprocedure(
    'public.rc1_guard_coach_clients_direct_write()'
  );
  guard_trigger_count integer;
  enabled_guard_trigger_count integer;
  linked_guard_trigger_count integer;
  relation_function record;
  delete_account_function record;
  privilege_name text;
BEGIN
  IF to_regclass('public.coach_clients') IS NULL THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_COACH_CLIENTS_MISSING';
  END IF;

  FOREACH privilege_name IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE']
  LOOP
    IF pg_catalog.has_table_privilege(
      'authenticated', 'public.coach_clients', privilege_name
    ) THEN
      RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_AUTHENTICATED_DML_REMAINS: %',
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
      RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_SERVICE_ROLE_PRIVILEGE_REMAINS: %',
        privilege_name;
    END IF;
  END LOOP;

  IF NOT pg_catalog.has_table_privilege(
    'anon', 'public.coach_clients', 'SELECT'
  ) OR NOT pg_catalog.has_table_privilege(
    'authenticated', 'public.coach_clients', 'SELECT'
  ) OR NOT pg_catalog.has_table_privilege(
    'service_role', 'public.coach_clients', 'SELECT'
  ) THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_REQUIRED_SELECT_GRANT_MISSING';
  END IF;

  IF pg_catalog.current_setting('server_version_num')::integer >= 170000
    AND (
      pg_catalog.has_table_privilege(
        'anon', 'public.coach_clients', 'MAINTAIN'
      ) OR pg_catalog.has_table_privilege(
        'authenticated', 'public.coach_clients', 'MAINTAIN'
      ) OR pg_catalog.has_table_privilege(
        'service_role', 'public.coach_clients', 'MAINTAIN'
      )
    )
  THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_API_MAINTAIN_GRANT_REMAINS';
  END IF;

  SELECT
    routine_owner.rolname AS owner_name,
    routine.prosecdef AS security_definer,
    routine.proconfig AS config,
    routine.prosrc AS body
  INTO relation_function
  FROM pg_catalog.pg_proc AS routine
  JOIN pg_catalog.pg_roles AS routine_owner
    ON routine_owner.oid = routine.proowner
  WHERE routine.oid = to_regprocedure(
    'public.transition_coach_client_relation(uuid,uuid,text,text,uuid,text)'
  );

  IF relation_function.owner_name IS DISTINCT FROM 'postgres'
    OR relation_function.security_definer IS DISTINCT FROM true
    OR relation_function.config IS DISTINCT FROM ARRAY['search_path=""']::text[]
  THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_M9_CONTRACT_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS routine
    WHERE routine.oid = to_regprocedure(
      'public.consume_coach_invitation_v2(bytea)'
    )
      AND routine.prosecdef
      AND routine.proconfig IS NOT DISTINCT FROM ARRAY['search_path=""']::text[]
      AND routine.prosrc LIKE '%public.transition_coach_client_relation(%'
  ) THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_M10_CONTRACT_INVALID';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS routine
    WHERE routine.oid = to_regprocedure(
      'public.is_active_coach_client_relation(uuid,uuid)'
    )
      AND routine.prosecdef
      AND routine.provolatile = 's'
      AND routine.proconfig IS NOT DISTINCT FROM ARRAY['search_path=""']::text[]
      AND routine.prosrc LIKE '%relation.source IN (''invitation'', ''admin'')%'
      AND routine.prosrc NOT LIKE '%''legacy''%'
  ) THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_M12_CONTRACT_INVALID';
  END IF;

  SELECT
    routine_owner.rolname AS owner_name,
    routine.prosecdef AS security_definer,
    routine.proconfig AS config,
    routine.prosrc AS body
  INTO delete_account_function
  FROM pg_catalog.pg_proc AS routine
  JOIN pg_catalog.pg_roles AS routine_owner
    ON routine_owner.oid = routine.proowner
  WHERE routine.oid = to_regprocedure('public.delete_user_account(uuid)');

  IF delete_account_function.owner_name IS DISTINCT FROM 'postgres'
    OR delete_account_function.security_definer IS DISTINCT FROM true
    OR delete_account_function.config IS DISTINCT FROM ARRAY['search_path=""']::text[]
    OR delete_account_function.body LIKE '%DELETE FROM public.coach_clients%'
  THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_DELETE_ACCOUNT_CONTRACT_INVALID';
  END IF;

  SELECT count(*)::integer,
    count(*) FILTER (WHERE trigger_definition.tgenabled = 'O')::integer,
    count(*) FILTER (
      WHERE trigger_definition.tgfoid = guard_function
        AND trigger_definition.tgenabled = 'O'
    )::integer
  INTO guard_trigger_count, enabled_guard_trigger_count,
    linked_guard_trigger_count
  FROM pg_catalog.pg_trigger AS trigger_definition
  WHERE trigger_definition.tgrelid = 'public.coach_clients'::regclass
    AND trigger_definition.tgname = 'rc1_guard_coach_clients_direct_write'
    AND NOT trigger_definition.tgisinternal;

  IF (guard_function IS NULL AND guard_trigger_count <> 0)
    OR (guard_function IS NOT NULL AND (
      guard_trigger_count <> 1
      OR enabled_guard_trigger_count <> 1
      OR linked_guard_trigger_count <> 1
    ))
  THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_TEMPORARY_LOCK_STATE_INCONSISTENT';
  END IF;

  IF guard_function IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS routine
    JOIN pg_catalog.pg_roles AS routine_owner
      ON routine_owner.oid = routine.proowner
    WHERE routine.oid = guard_function
      AND routine_owner.rolname = 'postgres'
      AND NOT routine.prosecdef
      AND routine.proconfig IS NOT DISTINCT FROM ARRAY['search_path=""']::text[]
      AND routine.prosrc LIKE '%current_user IN (''anon'',''authenticated'',''service_role'')%'
      AND routine.prosrc LIKE '%RC1_LEGACY_COACH_CLIENTS_DIRECT_WRITE_BLOCKED%'
  ) THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_TEMPORARY_GUARD_CONTRACT_INVALID';
  END IF;
END
$preflight$;

DROP TRIGGER IF EXISTS rc1_guard_coach_clients_direct_write
  ON public.coach_clients;
DROP FUNCTION IF EXISTS public.rc1_guard_coach_clients_direct_write();

DO $postflight$
DECLARE
  privilege_name text;
BEGIN
  IF to_regprocedure('public.rc1_guard_coach_clients_direct_write()') IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.pg_trigger AS trigger_definition
      WHERE trigger_definition.tgrelid = 'public.coach_clients'::regclass
        AND trigger_definition.tgname =
          'rc1_guard_coach_clients_direct_write'
        AND NOT trigger_definition.tgisinternal
    )
  THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_OBJECT_REMAINS';
  END IF;

  FOREACH privilege_name IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE']
  LOOP
    IF pg_catalog.has_table_privilege(
      'authenticated', 'public.coach_clients', privilege_name
    ) THEN
      RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_AUTHENTICATED_DML_REGRESSION: %',
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
      RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_SERVICE_ROLE_REGRESSION: %',
        privilege_name;
    END IF;
  END LOOP;

  IF pg_catalog.current_setting('server_version_num')::integer >= 170000
    AND (
      pg_catalog.has_table_privilege(
        'anon', 'public.coach_clients', 'MAINTAIN'
      ) OR pg_catalog.has_table_privilege(
        'authenticated', 'public.coach_clients', 'MAINTAIN'
      ) OR pg_catalog.has_table_privilege(
        'service_role', 'public.coach_clients', 'MAINTAIN'
      )
    )
  THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_MAINTAIN_REGRESSION';
  END IF;

  IF to_regprocedure(
    'public.transition_coach_client_relation(uuid,uuid,text,text,uuid,text)'
  ) IS NULL OR to_regprocedure(
    'public.consume_coach_invitation_v2(bytea)'
  ) IS NULL OR to_regprocedure(
    'public.is_active_coach_client_relation(uuid,uuid)'
  ) IS NULL THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_RELATION_FUNCTION_REGRESSION';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS routine
    JOIN pg_catalog.pg_roles AS routine_owner
      ON routine_owner.oid = routine.proowner
    WHERE routine.oid = to_regprocedure('public.delete_user_account(uuid)')
      AND routine_owner.rolname = 'postgres'
      AND routine.prosecdef
      AND routine.proconfig IS NOT DISTINCT FROM ARRAY['search_path=""']::text[]
      AND routine.prosrc NOT LIKE '%DELETE FROM public.coach_clients%'
  ) THEN
    RAISE EXCEPTION 'WRITER_LOCK_REMOVAL_DELETE_ACCOUNT_REGRESSION';
  END IF;
END
$postflight$;

COMMIT;
