\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'writer-coach@test.invalid'),
  ('50000000-0000-0000-0000-000000000002', 'writer-client@test.invalid'),
  ('50000000-0000-0000-0000-000000000003', 'writer-other-coach@test.invalid'),
  ('50000000-0000-0000-0000-000000000004', 'writer-other-client@test.invalid'),
  ('50000000-0000-0000-0000-000000000005', 'writer-admin@test.invalid'),
  ('50000000-0000-0000-0000-000000000006', 'writer-no-profile@test.invalid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, role)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'writer-coach@test.invalid', 'coach'),
  ('50000000-0000-0000-0000-000000000002', 'writer-client@test.invalid', 'client'),
  ('50000000-0000-0000-0000-000000000003', 'writer-other-coach@test.invalid', 'coach'),
  ('50000000-0000-0000-0000-000000000004', 'writer-other-client@test.invalid', 'client'),
  ('50000000-0000-0000-0000-000000000005', 'writer-admin@test.invalid', 'admin')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

DELETE FROM public.profiles
WHERE id = '50000000-0000-0000-0000-000000000006';

-- The temporary lock still rejects every direct application-role mutation.
SET LOCAL ROLE anon;
DO $test$
BEGIN
  BEGIN
    INSERT INTO public.coach_clients (coach_id, client_id, status, source, started_at)
    VALUES ('50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 'active', 'invitation', now());
    RAISE EXCEPTION 'ANON_DIRECT_RELATION_WRITE_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$test$;

RESET ROLE;
SET LOCAL ROLE authenticated;
DO $test$
BEGIN
  BEGIN
    UPDATE public.coach_clients SET started_at = started_at WHERE false;
    RAISE EXCEPTION 'AUTHENTICATED_DIRECT_RELATION_WRITE_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$test$;

RESET ROLE;
SET LOCAL ROLE service_role;
DO $test$
DECLARE
  result jsonb;
BEGIN
  BEGIN
    DELETE FROM public.coach_clients WHERE false;
    RAISE EXCEPTION 'SERVICE_ROLE_DIRECT_RELATION_WRITE_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  SELECT public.transition_coach_client_relation(
    '50000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    'create', 'invitation',
    '50000000-0000-0000-0000-000000000002', NULL
  ) INTO result;
  IF result->>'outcome' <> 'created' THEN
    RAISE EXCEPTION 'AUTHORIZED_INVITATION_CREATE_FAILED: %', result;
  END IF;

  SELECT public.transition_coach_client_relation(
    '50000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    'create', 'invitation',
    '50000000-0000-0000-0000-000000000002', NULL
  ) INTO result;
  IF result->>'outcome' <> 'already_active_same_coach' THEN
    RAISE EXCEPTION 'SAME_COACH_IDEMPOTENCE_FAILED: %', result;
  END IF;

  SELECT public.transition_coach_client_relation(
    '50000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000003',
    'create', 'invitation',
    '50000000-0000-0000-0000-000000000002', NULL
  ) INTO result;
  IF result->>'code' <> 'RELATION_ACTIVE_COACH_CONFLICT' THEN
    RAISE EXCEPTION 'MULTIPLE_ACTIVE_COACH_NOT_BLOCKED: %', result;
  END IF;

  SELECT public.transition_coach_client_relation(
    '50000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    'end', 'legacy',
    '50000000-0000-0000-0000-000000000002', 'client_request'
  ) INTO result;
  IF result->>'outcome' <> 'ended' THEN
    RAISE EXCEPTION 'AUTHORIZED_CLIENT_END_FAILED: %', result;
  END IF;

  SELECT public.transition_coach_client_relation(
    '50000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    'end', 'legacy',
    '50000000-0000-0000-0000-000000000002', 'client_request'
  ) INTO result;
  IF result->>'outcome' <> 'no_active_relation' THEN
    RAISE EXCEPTION 'REPEAT_END_NOT_IDEMPOTENT: %', result;
  END IF;

  SELECT public.transition_coach_client_relation(
    '50000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    'create', 'invitation',
    '50000000-0000-0000-0000-000000000002', NULL
  ) INTO result;
  IF result->>'outcome' <> 'created' THEN
    RAISE EXCEPTION 'REACTIVATION_FAILED: %', result;
  END IF;

  SELECT public.transition_coach_client_relation(
    '50000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    'end', 'legacy',
    '50000000-0000-0000-0000-000000000001', 'coach_request'
  ) INTO result;
  IF result->>'outcome' <> 'ended' THEN
    RAISE EXCEPTION 'AUTHORIZED_COACH_END_FAILED: %', result;
  END IF;

  SELECT public.transition_coach_client_relation(
    '50000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000001',
    'create', 'admin',
    '50000000-0000-0000-0000-000000000005', NULL
  ) INTO result;
  IF result->>'outcome' <> 'created' THEN
    RAISE EXCEPTION 'AUTHORIZED_ADMIN_CREATE_FAILED: %', result;
  END IF;

  SELECT public.transition_coach_client_relation(
    '50000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000003',
    'replace', 'admin',
    '50000000-0000-0000-0000-000000000005', NULL
  ) INTO result;
  IF result->>'outcome' <> 'replaced' THEN
    RAISE EXCEPTION 'AUTHORIZED_ADMIN_REPLACE_FAILED: %', result;
  END IF;

  SELECT public.transition_coach_client_relation(
    '50000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000003',
    'end', 'admin',
    '50000000-0000-0000-0000-000000000005', 'admin_action'
  ) INTO result;
  IF result->>'outcome' <> 'ended' THEN
    RAISE EXCEPTION 'AUTHORIZED_ADMIN_END_FAILED: %', result;
  END IF;

  -- Wrong party roles, self-relation, absent profiles and unauthorized actors.
  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000004','create','invitation','50000000-0000-0000-0000-000000000002',NULL) INTO result;
  IF result->>'code' <> 'RELATION_COACH_ROLE_INVALID' THEN RAISE EXCEPTION 'CLIENT_AS_COACH_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000003','create','invitation','50000000-0000-0000-0000-000000000001',NULL) INTO result;
  IF result->>'code' <> 'RELATION_CLIENT_ROLE_INVALID' THEN RAISE EXCEPTION 'COACH_AS_CLIENT_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','create','invitation','50000000-0000-0000-0000-000000000001',NULL) INTO result;
  IF result->>'code' <> 'RELATION_PARTIES_MUST_DIFFER' THEN RAISE EXCEPTION 'SELF_RELATION_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000001','create','invitation','50000000-0000-0000-0000-000000000006',NULL) INTO result;
  IF result->>'code' <> 'RELATION_CLIENT_ROLE_INVALID' THEN RAISE EXCEPTION 'PROFILELESS_CLIENT_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001','end','legacy','50000000-0000-0000-0000-000000000006','client_request') INTO result;
  IF result->>'code' <> 'RELATION_ACTOR_PROFILE_INVALID' THEN RAISE EXCEPTION 'PROFILELESS_ACTOR_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','end','legacy','50000000-0000-0000-0000-000000000004','client_request') INTO result;
  IF result->>'code' <> 'RELATION_ACTOR_UNAUTHORIZED' THEN RAISE EXCEPTION 'UNRELATED_CLIENT_ACTOR_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','end','legacy','50000000-0000-0000-0000-000000000003','client_request') INTO result;
  IF result->>'code' <> 'RELATION_ACTOR_UNAUTHORIZED' THEN RAISE EXCEPTION 'WRONG_ROLE_ACTOR_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001','create','default','50000000-0000-0000-0000-000000000004',NULL) INTO result;
  IF result->>'code' <> 'RELATION_ACTOR_UNAUTHORIZED' THEN RAISE EXCEPTION 'DEFAULT_SOURCE_ESCALATION_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001','create','legacy','50000000-0000-0000-0000-000000000004',NULL) INTO result;
  IF result->>'code' <> 'RELATION_ACTOR_UNAUTHORIZED' THEN RAISE EXCEPTION 'LEGACY_SOURCE_ESCALATION_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001','create','invitation','50000000-0000-0000-0000-000000000005',NULL) INTO result;
  IF result->>'code' <> 'RELATION_ACTOR_UNAUTHORIZED' THEN RAISE EXCEPTION 'INVITATION_ADMIN_ESCALATION_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001','create','admin','50000000-0000-0000-0000-000000000004',NULL) INTO result;
  IF result->>'code' <> 'RELATION_ACTOR_UNAUTHORIZED' THEN RAISE EXCEPTION 'ADMIN_CLIENT_ESCALATION_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001','create','invitation','59999999-9999-4999-8999-999999999999',NULL) INTO result;
  IF result->>'code' <> 'RELATION_ACTOR_NOT_FOUND' THEN RAISE EXCEPTION 'MISSING_ACTOR_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001','create','unsupported','50000000-0000-0000-0000-000000000004',NULL) INTO result;
  IF result->>'code' <> 'RELATION_SOURCE_INVALID' THEN RAISE EXCEPTION 'INVALID_SOURCE_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001','unsupported','invitation','50000000-0000-0000-0000-000000000004',NULL) INTO result;
  IF result->>'code' <> 'RELATION_OPERATION_INVALID' THEN RAISE EXCEPTION 'INVALID_OPERATION_ALLOWED: %', result; END IF;

  SELECT public.transition_coach_client_relation('50000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000001','end','legacy','50000000-0000-0000-0000-000000000004','replaced') INTO result;
  IF result->>'code' <> 'RELATION_END_REASON_REQUIRED' THEN RAISE EXCEPTION 'INVALID_END_REASON_ALLOWED: %', result; END IF;
END
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.coach_clients
    WHERE client_id::text LIKE '50000000-%'
      AND (
        status NOT IN ('active', 'ended')
        OR source NOT IN ('invitation', 'admin')
        OR (status = 'active' AND (ended_at IS NOT NULL OR ended_by IS NOT NULL OR end_reason IS NOT NULL))
        OR (status = 'ended' AND (ended_at IS NULL OR end_reason IS NULL))
      )
  ) THEN
    RAISE EXCEPTION 'CANONICAL_WRITER_LIFECYCLE_INVARIANT_FAILED';
  END IF;

  IF EXISTS (
    SELECT client_id FROM public.coach_clients
    WHERE client_id::text LIKE '50000000-%' AND status = 'active'
    GROUP BY client_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'CANONICAL_WRITER_MULTIPLE_ACTIVE_RELATIONS';
  END IF;
END
$test$;

ROLLBACK;
