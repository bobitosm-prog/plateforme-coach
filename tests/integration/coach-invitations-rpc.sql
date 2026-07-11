\set ON_ERROR_STOP on

-- Deterministic local-only identities.
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('10000000-0000-4000-8000-000000000001', 'coach-a@example.test', now()),
  ('10000000-0000-4000-8000-000000000002', 'coach-b@example.test', now()),
  ('20000000-0000-4000-8000-000000000001', 'client@example.test', now()),
  ('20000000-0000-4000-8000-000000000002', 'other@example.test', now()),
  ('20000000-0000-4000-8000-000000000003', 'unverified@example.test', NULL),
  ('20000000-0000-4000-8000-000000000004', 'invited@example.test', now()),
  ('20000000-0000-4000-8000-000000000005', 'lifetime@example.test', now()),
  ('20000000-0000-4000-8000-000000000006', 'paying@example.test', now());

INSERT INTO public.profiles (
  id, email, role, subscription_type, subscription_status,
  subscription_end_date, stripe_subscription_id, trial_ends_at
) VALUES
  ('10000000-0000-4000-8000-000000000001', 'coach-a@example.test', 'coach', NULL, NULL, NULL, NULL, NULL),
  ('10000000-0000-4000-8000-000000000002', 'coach-b@example.test', 'coach', NULL, NULL, NULL, NULL, NULL),
  ('20000000-0000-4000-8000-000000000001', 'client@example.test', 'client', NULL, NULL, NULL, NULL, now() + interval '5 days'),
  ('20000000-0000-4000-8000-000000000002', 'other@example.test', 'client', NULL, NULL, NULL, NULL, NULL),
  ('20000000-0000-4000-8000-000000000003', 'unverified@example.test', 'client', NULL, NULL, NULL, NULL, NULL),
  ('20000000-0000-4000-8000-000000000004', 'invited@example.test', 'client', 'invited', 'active', NULL, NULL, NULL),
  ('20000000-0000-4000-8000-000000000005', 'lifetime@example.test', 'client', 'lifetime', 'lifetime', NULL, NULL, NULL),
  ('20000000-0000-4000-8000-000000000006', 'paying@example.test', 'client', 'client_monthly', 'active', now() + interval '30 days', 'sub_local', NULL);

-- Schema and catalog checks.
SELECT test.assert(to_regclass('public.coach_invitations') IS NOT NULL, 'coach_invitations table missing');

SELECT test.assert(
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'public.coach_invitations'::regclass),
  'RLS must be enabled and forced'
);

SELECT test.assert(
  (SELECT proconfig @> ARRAY['search_path=pg_catalog, public']
   FROM pg_proc
   WHERE oid = 'public.consume_coach_invitation(bytea)'::regprocedure),
  'RPC search_path is not fixed'
);

SELECT test.assert(
  has_function_privilege('authenticated', 'public.consume_coach_invitation(bytea)', 'EXECUTE'),
  'authenticated must execute consumption RPC'
);

SELECT test.assert(
  NOT has_function_privilege('anon', 'public.consume_coach_invitation(bytea)', 'EXECUTE'),
  'anon must not execute consumption RPC'
);

SELECT test.assert(
  NOT has_column_privilege('authenticated', 'public.coach_invitations', 'token_hash', 'SELECT'),
  'authenticated must never select token_hash'
);

-- Constraint checks use savepoints so expected failures do not abort the file.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.coach_invitations (
      coach_id, recipient_email, token_hash, status, expires_at
    ) VALUES (
      '10000000-0000-4000-8000-000000000001',
      'invalid-status@example.test',
      decode(repeat('01', 32), 'hex'),
      'invalid',
      now() + interval '7 days'
    );
    RAISE EXCEPTION 'ASSERTION_FAILED: invalid status accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.coach_invitations (
      coach_id, recipient_email, token_hash, expires_at
    ) VALUES (
      '10000000-0000-4000-8000-000000000001',
      'short-hash@example.test',
      decode('01', 'hex'),
      now() + interval '7 days'
    );
    RAISE EXCEPTION 'ASSERTION_FAILED: short token hash accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.coach_invitations (
      coach_id, recipient_email, token_hash, expires_at
    ) VALUES (
      '10000000-0000-4000-8000-000000000001',
      'late@example.test',
      decode(repeat('02', 32), 'hex'),
      now() - interval '1 day'
    );
    RAISE EXCEPTION 'ASSERTION_FAILED: invalid expiration accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.coach_invitations (
      coach_id, recipient_email, token_hash, status, expires_at, consumed_at
    ) VALUES (
      '10000000-0000-4000-8000-000000000001',
      'incoherent@example.test',
      decode(repeat('03', 32), 'hex'),
      'consumed',
      now() + interval '7 days',
      now()
    );
    RAISE EXCEPTION 'ASSERTION_FAILED: incoherent consumed row accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.coach_invitations (
      coach_id, recipient_email, token_hash, expires_at
    ) VALUES (
      '10000000-0000-4000-8000-000000000001',
      'UPPER@example.test',
      decode(repeat('04', 32), 'hex'),
      now() + interval '7 days'
    );
    RAISE EXCEPTION 'ASSERTION_FAILED: non-normalized email accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

-- Seed invitations through the owner for RPC and terminal-state cases.
INSERT INTO public.coach_invitations (
  id, coach_id, recipient_email, token_hash, status, expires_at,
  created_at, consumed_at, consumed_by, revoked_at, revoked_by
) VALUES
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'client@example.test', decode(repeat('11', 32), 'hex'), 'pending', now() - interval '1 day', now() - interval '8 days', NULL, NULL, NULL, NULL),
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'client@example.test', decode(repeat('10', 32), 'hex'), 'pending', now() + interval '7 days', now(), NULL, NULL, NULL, NULL),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'client@example.test', decode(repeat('12', 32), 'hex'), 'revoked', now() + interval '7 days', now(), NULL, NULL, now(), '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'client@example.test', decode(repeat('13', 32), 'hex'), 'consumed', now() + interval '7 days', now(), now(), '20000000-0000-4000-8000-000000000001', NULL, NULL),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'unverified@example.test', decode(repeat('14', 32), 'hex'), 'pending', now() + interval '7 days', now(), NULL, NULL, NULL, NULL),
  ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'invited@example.test', decode(repeat('15', 32), 'hex'), 'pending', now() + interval '7 days', now(), NULL, NULL, NULL, NULL),
  ('30000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'lifetime@example.test', decode(repeat('16', 32), 'hex'), 'pending', now() + interval '7 days', now(), NULL, NULL, NULL, NULL),
  ('30000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'paying@example.test', decode(repeat('17', 32), 'hex'), 'pending', now() + interval '7 days', now(), NULL, NULL, NULL, NULL);

-- Unique hash and pending duplicate behavior.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.coach_invitations (
      coach_id, recipient_email, token_hash, expires_at
    ) VALUES (
      '10000000-0000-4000-8000-000000000002',
      'unique@example.test',
      decode(repeat('10', 32), 'hex'),
      now() + interval '7 days'
    );
    RAISE EXCEPTION 'ASSERTION_FAILED: duplicate token hash accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.coach_invitations (
      coach_id, recipient_email, token_hash, expires_at
    ) VALUES (
      '10000000-0000-4000-8000-000000000001',
      'client@example.test',
      decode(repeat('18', 32), 'hex'),
      now() + interval '7 days'
    );
    RAISE EXCEPTION 'ASSERTION_FAILED: duplicate non-expired pending invitation accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'INVITATION_ALREADY_PENDING' THEN RAISE; END IF;
  END;
END;
$$;

-- A new pending row is allowed when only an expired pending row exists.
INSERT INTO public.coach_invitations (
  coach_id, recipient_email, token_hash, created_at, expires_at
) VALUES (
  '10000000-0000-4000-8000-000000000001',
  'expired-only@example.test',
  decode(repeat('19', 32), 'hex'),
  now() - interval '8 days',
  now() - interval '1 hour'
);

INSERT INTO public.coach_invitations (
  coach_id, recipient_email, token_hash, expires_at
) VALUES (
  '10000000-0000-4000-8000-000000000001',
  'expired-only@example.test',
  decode(repeat('1a', 32), 'hex'),
  now() + interval '7 days'
);

-- RLS: coach A inserts and sees its row but not coach B's row.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);

INSERT INTO public.coach_invitations (
  coach_id, recipient_email, token_hash, expires_at
) VALUES (
  '10000000-0000-4000-8000-000000000001',
  'rls-a@example.test',
  decode(repeat('20', 32), 'hex'),
  now() + interval '7 days'
);

SELECT test.assert(
  EXISTS (SELECT 1 FROM public.coach_invitations WHERE recipient_email = 'rls-a@example.test'),
  'coach A cannot read own invitation'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.coach_invitations (
      coach_id, recipient_email, token_hash, expires_at
    ) VALUES (
      '10000000-0000-4000-8000-000000000002',
      'forged-owner@example.test',
      decode(repeat('21', 32), 'hex'),
      now() + interval '7 days'
    );
    RAISE EXCEPTION 'ASSERTION_FAILED: coach A inserted for coach B';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

INSERT INTO public.coach_invitations (
  coach_id, recipient_email, token_hash, expires_at
) VALUES (
  '10000000-0000-4000-8000-000000000002',
  'rls-b@example.test',
  decode(repeat('22', 32), 'hex'),
  now() + interval '7 days'
);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
SELECT test.assert(
  NOT EXISTS (SELECT 1 FROM public.coach_invitations WHERE recipient_email = 'rls-b@example.test'),
  'coach A can read coach B invitation'
);

-- token_hash is denied at the privilege layer, independently from RLS.
DO $$
BEGIN
  BEGIN
    PERFORM token_hash FROM public.coach_invitations LIMIT 1;
    RAISE EXCEPTION 'ASSERTION_FAILED: authenticated read token_hash';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

-- Direct consumed transition is denied.
DO $$
BEGIN
  BEGIN
    UPDATE public.coach_invitations
    SET status = 'consumed'
    WHERE recipient_email = 'rls-a@example.test';
    RAISE EXCEPTION 'ASSERTION_FAILED: direct consumed update succeeded';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
  END;
END;
$$;

-- Authorized revocation updates updated_at and terminal fields.
DO $$
DECLARE
  before_update timestamptz;
  after_update timestamptz;
BEGIN
  SELECT updated_at INTO before_update
  FROM public.coach_invitations
  WHERE recipient_email = 'rls-a@example.test';

  PERFORM pg_sleep(0.01);

  UPDATE public.coach_invitations
  SET status = 'revoked', revoked_at = clock_timestamp(), revoked_by = auth.uid()
  WHERE recipient_email = 'rls-a@example.test';

  SELECT updated_at INTO after_update
  FROM public.coach_invitations
  WHERE recipient_email = 'rls-a@example.test';

  PERFORM test.assert(after_update > before_update, 'updated_at trigger did not advance');
END;
$$;

RESET ROLE;

-- Standard client sees no invitation rows and cannot insert.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
SELECT test.assert(
  NOT EXISTS (SELECT 1 FROM public.coach_invitations),
  'standard client can list invitations'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.coach_invitations (
      coach_id, recipient_email, token_hash, expires_at
    ) VALUES (
      '20000000-0000-4000-8000-000000000002',
      'client-created@example.test',
      decode(repeat('23', 32), 'hex'),
      now() + interval '7 days'
    );
    RAISE EXCEPTION 'ASSERTION_FAILED: standard client inserted invitation';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

-- Anonymous cannot execute the RPC.
SET ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.consume_coach_invitation(decode(repeat('10', 32), 'hex'));
    RAISE EXCEPTION 'ASSERTION_FAILED: anon executed RPC';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

-- Stable refusal codes under real authenticated identities.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', false);
SELECT test.assert(
  public.consume_coach_invitation(decode(repeat('ff', 32), 'hex'))->>'code' = 'INVITATION_INVALID',
  'unknown token code mismatch'
);
SELECT test.assert(
  public.consume_coach_invitation(decode('01', 'hex'))->>'code' = 'INVITATION_INVALID',
  'short hash code mismatch'
);
SELECT test.assert(
  public.consume_coach_invitation(decode(repeat('11', 32), 'hex'))->>'code' = 'INVITATION_EXPIRED',
  'expired code mismatch'
);
SELECT test.assert(
  public.consume_coach_invitation(decode(repeat('12', 32), 'hex'))->>'code' = 'INVITATION_REVOKED',
  'revoked code mismatch'
);
SELECT test.assert(
  public.consume_coach_invitation(decode(repeat('13', 32), 'hex'))->>'code' = 'INVITATION_ALREADY_USED',
  'consumed code mismatch'
);

-- Email mismatch.
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', false);
SELECT test.assert(
  public.consume_coach_invitation(decode(repeat('10', 32), 'hex'))->>'code' = 'INVITATION_EMAIL_MISMATCH',
  'email mismatch code mismatch'
);

-- Unverified and incompatible subscriptions.
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', false);
SELECT test.assert(
  public.consume_coach_invitation(decode(repeat('14', 32), 'hex'))->>'code' = 'INVITATION_EMAIL_UNVERIFIED',
  'unverified email code mismatch'
);

SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000004', false);
SELECT test.assert(
  public.consume_coach_invitation(decode(repeat('15', 32), 'hex'))->>'code' = 'INVITATION_RECIPIENT_INELIGIBLE',
  'already invited must be ineligible'
);

SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000005', false);
SELECT test.assert(
  public.consume_coach_invitation(decode(repeat('16', 32), 'hex'))->>'code' = 'INVITATION_RECIPIENT_INELIGIBLE',
  'lifetime must be ineligible'
);

SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000006', false);
SELECT test.assert(
  public.consume_coach_invitation(decode(repeat('17', 32), 'hex'))->>'code' = 'INVITATION_RECIPIENT_INELIGIBLE',
  'paying subscriber must be ineligible'
);
RESET ROLE;

-- Rollback proof: a local-only trigger causes the relation insert to fail
-- after the profile UPDATE. PostgreSQL must roll back the entire RPC statement.
CREATE OR REPLACE FUNCTION test.fail_coach_client_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'LOCAL_FORCED_RELATION_FAILURE';
END;
$$;

CREATE TRIGGER local_force_relation_failure
  BEFORE INSERT ON public.coach_clients
  FOR EACH ROW
  EXECUTE FUNCTION test.fail_coach_client_insert();

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', false);
DO $$
BEGIN
  BEGIN
    PERFORM public.consume_coach_invitation(decode(repeat('10', 32), 'hex'));
    RAISE EXCEPTION 'ASSERTION_FAILED: forced relation failure did not fail';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'ASSERTION_FAILED: forced relation failure did not fail' THEN RAISE; END IF;
  END;
END;
$$;
RESET ROLE;

DROP TRIGGER local_force_relation_failure ON public.coach_clients;
DROP FUNCTION test.fail_coach_client_insert();

SELECT test.assert(
  (SELECT subscription_type IS NULL AND subscription_status IS NULL AND trial_ends_at IS NOT NULL
   FROM public.profiles WHERE id = '20000000-0000-4000-8000-000000000001'),
  'profile mutation survived rollback'
);
SELECT test.assert(
  NOT EXISTS (
    SELECT 1 FROM public.coach_clients
    WHERE coach_id = '10000000-0000-4000-8000-000000000001'
      AND client_id = '20000000-0000-4000-8000-000000000001'
  ),
  'coach_clients relation survived rollback'
);
SELECT test.assert(
  (SELECT status = 'pending' AND consumed_by IS NULL AND consumed_at IS NULL
   FROM public.coach_invitations WHERE id = '30000000-0000-4000-8000-000000000001'),
  'invitation mutation survived rollback'
);

-- Valid consumption after removing the local failure trigger.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', false);
SELECT test.assert(
  public.consume_coach_invitation(decode(repeat('10', 32), 'hex'))->>'success' = 'true',
  'valid consumption failed'
);
RESET ROLE;

SELECT test.assert(
  (SELECT role = 'client'
      AND subscription_status = 'active'
      AND subscription_type = 'invited'
      AND trial_ends_at IS NULL
   FROM public.profiles WHERE id = '20000000-0000-4000-8000-000000000001'),
  'valid consumption profile state mismatch'
);
SELECT test.assert(
  EXISTS (
    SELECT 1 FROM public.coach_clients
    WHERE coach_id = '10000000-0000-4000-8000-000000000001'
      AND client_id = '20000000-0000-4000-8000-000000000001'
      AND status = 'active'
      AND invited_by_coach
  ),
  'valid consumption relation missing'
);
SELECT test.assert(
  (SELECT status = 'consumed'
      AND consumed_by = '20000000-0000-4000-8000-000000000001'
      AND consumed_at IS NOT NULL
   FROM public.coach_invitations WHERE id = '30000000-0000-4000-8000-000000000001'),
  'valid consumption invitation state mismatch'
);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', false);
SELECT test.assert(
  public.consume_coach_invitation(decode(repeat('10', 32), 'hex'))->>'code' = 'INVITATION_ALREADY_USED',
  'second consumption was not refused'
);
RESET ROLE;

SELECT 'coach invitation integration tests passed' AS result;
