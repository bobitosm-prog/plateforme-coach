\set ON_ERROR_STOP on

BEGIN;

-- Model the final permanent state locally. The emergency lock is removed only
-- inside this transaction and is restored by ROLLBACK.
DO $test$
BEGIN
  IF to_regprocedure('public.rc1_guard_coach_clients_direct_write()') IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_trigger
      WHERE tgrelid = 'public.coach_clients'::regclass
        AND tgname = 'rc1_guard_coach_clients_direct_write'
        AND tgenabled = 'O'
        AND NOT tgisinternal
    )
  THEN
    RAISE EXCEPTION 'DELETE_ACCOUNT_WRITER_LOCK_BASELINE_MISSING';
  END IF;
END
$test$;

DROP TRIGGER rc1_guard_coach_clients_direct_write
  ON public.coach_clients;
DROP FUNCTION public.rc1_guard_coach_clients_direct_write();

INSERT INTO auth.users (id, email)
VALUES
  ('51000000-0000-0000-0000-000000000001', 'delete-solo@test.invalid'),
  ('51000000-0000-0000-0000-000000000002', 'delete-relation-client@test.invalid'),
  ('51000000-0000-0000-0000-000000000003', 'delete-relation-coach@test.invalid'),
  ('51000000-0000-0000-0000-000000000004', 'delete-coach@test.invalid'),
  ('51000000-0000-0000-0000-000000000005', 'delete-coach-client@test.invalid'),
  ('51000000-0000-0000-0000-000000000006', 'delete-attacker@test.invalid'),
  ('51000000-0000-0000-0000-000000000007', 'delete-target@test.invalid'),
  ('51000000-0000-0000-0000-000000000008', 'delete-null-role@test.invalid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, role)
VALUES
  ('51000000-0000-0000-0000-000000000001', 'delete-solo@test.invalid', 'client'),
  ('51000000-0000-0000-0000-000000000002', 'delete-relation-client@test.invalid', 'client'),
  ('51000000-0000-0000-0000-000000000003', 'delete-relation-coach@test.invalid', 'coach'),
  ('51000000-0000-0000-0000-000000000004', 'delete-coach@test.invalid', 'coach'),
  ('51000000-0000-0000-0000-000000000005', 'delete-coach-client@test.invalid', 'client'),
  ('51000000-0000-0000-0000-000000000006', 'delete-attacker@test.invalid', 'client'),
  ('51000000-0000-0000-0000-000000000007', 'delete-target@test.invalid', 'client'),
  ('51000000-0000-0000-0000-000000000008', 'delete-null-role@test.invalid', NULL)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role;

INSERT INTO public.coach_clients (
  coach_id,
  client_id,
  status,
  source,
  started_at
)
VALUES
  (
    '51000000-0000-0000-0000-000000000003',
    '51000000-0000-0000-0000-000000000002',
    'active',
    'invitation',
    pg_catalog.now()
  ),
  (
    '51000000-0000-0000-0000-000000000004',
    '51000000-0000-0000-0000-000000000005',
    'active',
    'admin',
    pg_catalog.now()
  );

-- A caller-controlled pg_temp relation with the same unqualified legacy name
-- must remain untouched by the hardened function.
CREATE TEMPORARY TABLE profiles (
  id uuid PRIMARY KEY,
  role text NOT NULL
);
INSERT INTO pg_temp.profiles (id, role)
VALUES ('51000000-0000-0000-0000-000000000001', 'super_admin');

SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '51000000-0000-0000-0000-000000000001',
  true
);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
  result jsonb;
BEGIN
  SELECT public.delete_user_account(
    '51000000-0000-0000-0000-000000000001'
  ) INTO result;
  IF result->>'success' <> 'true'
    OR result->>'user_id' <> '51000000-0000-0000-0000-000000000001'
  THEN
    RAISE EXCEPTION 'DELETE_ACCOUNT_SOLO_CLIENT_FAILED: %', result;
  END IF;
END
$test$;
RESET ROLE;

DO $test$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = '51000000-0000-0000-0000-000000000001'
  ) THEN
    RAISE EXCEPTION 'DELETE_ACCOUNT_SOLO_PROFILE_REMAINS';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_temp.profiles
    WHERE id = '51000000-0000-0000-0000-000000000001'
      AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'DELETE_ACCOUNT_PG_TEMP_HIJACKED';
  END IF;
END
$test$;

SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '51000000-0000-0000-0000-000000000002',
  true
);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
  result jsonb;
BEGIN
  SELECT public.delete_user_account(
    '51000000-0000-0000-0000-000000000002'
  ) INTO result;
  IF result->>'success' <> 'true' THEN
    RAISE EXCEPTION 'DELETE_ACCOUNT_CLIENT_WITH_RELATION_FAILED: %', result;
  END IF;
END
$test$;
RESET ROLE;

DO $test$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.coach_clients
    WHERE client_id = '51000000-0000-0000-0000-000000000002'
  ) THEN
    RAISE EXCEPTION 'DELETE_ACCOUNT_CLIENT_RELATION_NOT_CASCADED';
  END IF;
END
$test$;

SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '51000000-0000-0000-0000-000000000004',
  true
);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
  result jsonb;
BEGIN
  SELECT public.delete_user_account(
    '51000000-0000-0000-0000-000000000004'
  ) INTO result;
  IF result->>'success' <> 'true' THEN
    RAISE EXCEPTION 'DELETE_ACCOUNT_COACH_WITH_CLIENT_FAILED: %', result;
  END IF;
END
$test$;
RESET ROLE;

DO $test$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.coach_clients
    WHERE coach_id = '51000000-0000-0000-0000-000000000004'
  ) THEN
    RAISE EXCEPTION 'DELETE_ACCOUNT_COACH_RELATION_NOT_CASCADED';
  END IF;
END
$test$;

-- Authenticated A cannot delete B.
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '51000000-0000-0000-0000-000000000006',
  true
);
SET LOCAL ROLE authenticated;
DO $test$
BEGIN
  BEGIN
    PERFORM public.delete_user_account(
      '51000000-0000-0000-0000-000000000007'
    );
    RAISE EXCEPTION 'DELETE_ACCOUNT_WRONG_USER_ALLOWED';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'Delete failed: Unauthorized:%' THEN
        RAISE;
      END IF;
  END;
END
$test$;
RESET ROLE;

-- A caller whose profile role is NULL must not bypass the wrong-user guard
-- through SQL three-valued boolean semantics.
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '51000000-0000-0000-0000-000000000008',
  true
);
SET LOCAL ROLE authenticated;
DO $test$
BEGIN
  BEGIN
    PERFORM public.delete_user_account(
      '51000000-0000-0000-0000-000000000007'
    );
    RAISE EXCEPTION 'DELETE_ACCOUNT_NULL_ROLE_WRONG_USER_ALLOWED';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'Delete failed: Unauthorized:%' THEN
        RAISE;
      END IF;
  END;
END
$test$;
RESET ROLE;

-- service_role retains EXECUTE for compatibility, but no JWT subject means it
-- cannot authorize account deletion.
SELECT pg_catalog.set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE service_role;
DO $test$
BEGIN
  BEGIN
    PERFORM public.delete_user_account(
      '51000000-0000-0000-0000-000000000007'
    );
    RAISE EXCEPTION 'DELETE_ACCOUNT_NO_JWT_ALLOWED';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'Delete failed: Unauthorized:%' THEN
        RAISE;
      END IF;
  END;
END
$test$;
RESET ROLE;

-- anon and PUBLIC do not have function execution privileges.
SET LOCAL ROLE anon;
DO $test$
BEGIN
  BEGIN
    PERFORM public.delete_user_account(
      '51000000-0000-0000-0000-000000000007'
    );
    RAISE EXCEPTION 'DELETE_ACCOUNT_ANON_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$test$;
RESET ROLE;

DO $test$
BEGIN
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
    RAISE EXCEPTION 'DELETE_ACCOUNT_PUBLIC_ALLOWED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = '51000000-0000-0000-0000-000000000007'
  ) THEN
    RAISE EXCEPTION 'DELETE_ACCOUNT_NEGATIVE_TARGET_REMOVED';
  END IF;

  BEGIN
    PERFORM public.delete_user_account('not-a-uuid');
    RAISE EXCEPTION 'DELETE_ACCOUNT_MALFORMED_UUID_ALLOWED';
  EXCEPTION WHEN invalid_text_representation THEN NULL;
  END;
END
$test$;

ROLLBACK;
