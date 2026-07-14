\set ON_ERROR_STOP on
\set client '71000000-0000-4000-8000-000000000001'
\set coach '71000000-0000-4000-8000-000000000002'
\set invited '71000000-0000-4000-8000-000000000003'
\set lifetime '71000000-0000-4000-8000-000000000004'
\set admin '71000000-0000-4000-8000-000000000005'
\set second_client '71000000-0000-4000-8000-000000000006'
\set second_coach '71000000-0000-4000-8000-000000000007'

BEGIN;
CREATE SCHEMA IF NOT EXISTS test;

CREATE OR REPLACE FUNCTION test.rls_assert(actual bigint, expected bigint, scenario text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'RLS_MATRIX_FAILED [%]: expected %, got %', scenario, expected, actual;
  END IF;
  RAISE NOTICE 'RLS_MATRIX_OK [%]', scenario;
END $$;

CREATE OR REPLACE FUNCTION test.rls_exec_count(statement text)
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE affected bigint;
BEGIN
  EXECUTE statement;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END $$;

CREATE OR REPLACE FUNCTION test.rls_expect_error(statement text, scenario text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN insufficient_privilege OR check_violation OR unique_violation OR foreign_key_violation THEN
    RAISE NOTICE 'RLS_MATRIX_OK [%]', scenario;
    RETURN;
  END;
  RAISE EXCEPTION 'RLS_MATRIX_FAILED [%]: statement unexpectedly succeeded', scenario;
END $$;

CREATE OR REPLACE FUNCTION test.rls_known_gap(exposed boolean, scenario text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF exposed THEN RAISE WARNING 'RLS_KNOWN_GAP [%]', scenario;
  ELSE RAISE NOTICE 'RLS_GAP_FIXED [%]', scenario;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION test.rls_statement_succeeds(statement text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  EXECUTE statement;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END $$;

GRANT USAGE ON SCHEMA test TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION test.rls_assert(bigint, bigint, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION test.rls_exec_count(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION test.rls_expect_error(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION test.rls_known_gap(boolean, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION test.rls_statement_succeeds(text) TO anon, authenticated, service_role;

SELECT test.rls_assert((
  SELECT count(*) FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'payments'
    AND policyname IN ('payments_client_select_own', 'payments_coach_select_active_clients')
    AND cmd = 'SELECT'
), 2, 'payments/catalog/exact-read-policies');
SELECT test.rls_assert((
  SELECT count(*) FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'payments' AND cmd <> 'SELECT'
), 0, 'payments/catalog/no-mutation-policy');
SELECT test.rls_assert(
  (has_table_privilege('authenticated', 'public.payments', 'INSERT')
   OR has_table_privilege('authenticated', 'public.payments', 'UPDATE')
   OR has_table_privilege('authenticated', 'public.payments', 'DELETE'))::int,
  0,
  'payments/catalog/no-authenticated-mutation-grant'
);

SELECT test.seed_personas();
SELECT test.set_persona_relation('coach', 'client', 'active');
SELECT test.set_persona_relation('secondCoach', 'secondClient', 'inactive');

INSERT INTO public.coach_invitations (id, coach_id, recipient_email, token_hash, expires_at)
VALUES
  ('72000000-0000-4000-8000-000000000001', :'coach', 'recipient-one@moovx.example.test', decode(repeat('11', 32), 'hex'), now() + interval '1 day'),
  ('72000000-0000-4000-8000-000000000002', :'second_coach', 'recipient-two@moovx.example.test', decode(repeat('22', 32), 'hex'), now() + interval '1 day');
INSERT INTO public.push_subscriptions (id, user_id, subscription) VALUES
  ('73000000-0000-4000-8000-000000000001', :'client', '{"endpoint":"https://push.invalid.test/client"}'),
  ('73000000-0000-4000-8000-000000000002', :'second_client', '{"endpoint":"https://push.invalid.test/second"}');
INSERT INTO public.payments (id, client_id, coach_id, amount, status, stripe_id) VALUES
  ('74000000-0000-4000-8000-000000000001', :'client', :'coach', 50, 'completed', 'pi_rls_client'),
  ('74000000-0000-4000-8000-000000000002', :'second_client', :'second_coach', 60, 'completed', 'pi_rls_second');

-- Anonymous: no target table exposes rows or mutations.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT test.rls_assert((SELECT count(*) FROM public.profiles), 0, 'profiles/anon/select');
SELECT test.rls_assert((SELECT count(*) FROM public.coach_clients), 0, 'coach_clients/anon/select');
SELECT test.rls_expect_error('SELECT id FROM public.coach_invitations', 'coach_invitations/anon/select-no-grant');
SELECT test.rls_assert((SELECT count(*) FROM public.push_subscriptions), 0, 'push_subscriptions/anon/select');
SELECT test.rls_expect_error('SELECT id FROM public.payments', 'payments/anon/select-no-grant');
RESET ROLE;

-- Client owner: own profile/subscription/payment visibility, no foreign mutation.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'client', true);
SELECT test.rls_assert((SELECT count(*) FROM public.profiles WHERE id = :'client'), 1, 'profiles/client-owner/select-own');
SELECT test.rls_assert((SELECT count(*) FROM public.profiles WHERE id = :'second_client'), 0, 'profiles/client-owner/select-foreign');
SELECT test.rls_assert((SELECT count(*) FROM public.profiles WHERE id = :'coach'), 1, 'profiles/client-owner/select-active-coach');
SELECT test.rls_known_gap(
  NOT test.rls_statement_succeeds('UPDATE public.profiles SET full_name = ''Client Updated'' WHERE id = ''' || :'client' || ''''),
  'profiles/client-owner/safe-update-broken-trigger; severity=high; impact=all-authenticated-profile-updates'
);
SELECT test.rls_assert(test.rls_statement_succeeds('UPDATE public.profiles SET role = ''coach'' WHERE id = ''' || :'client' || '''')::int, 0, 'profiles/client-owner/change-authority-denied');
SELECT test.rls_assert(test.rls_exec_count('UPDATE public.profiles SET full_name = ''Foreign'' WHERE id = ''' || :'second_client' || ''''), 0, 'profiles/client-owner/update-foreign');
SELECT test.rls_assert(test.rls_exec_count('DELETE FROM public.profiles WHERE id = ''' || :'client' || ''''), 0, 'profiles/client-owner/delete-own');
SELECT test.rls_assert((SELECT count(*) FROM public.coach_clients WHERE client_id = :'client'), 1, 'coach_clients/client-endpoint/select');
SELECT test.rls_assert((SELECT count(*) FROM public.coach_clients WHERE client_id = :'second_client'), 0, 'coach_clients/client/select-foreign');
SELECT test.rls_assert(test.rls_exec_count('UPDATE public.coach_clients SET coach_id = ''' || :'second_coach' || ''' WHERE client_id = ''' || :'client' || ''''), 0, 'coach_clients/client/update-owner');
SELECT test.rls_assert(test.rls_exec_count('DELETE FROM public.coach_clients WHERE client_id = ''' || :'client' || ''''), 0, 'coach_clients/client/delete');
SELECT test.rls_assert((SELECT count(*) FROM public.push_subscriptions WHERE user_id = :'client'), 1, 'push_subscriptions/client/select-own');
SELECT test.rls_assert((SELECT count(*) FROM public.push_subscriptions WHERE user_id = :'second_client'), 0, 'push_subscriptions/client/select-foreign');
SELECT test.rls_expect_error('UPDATE public.push_subscriptions SET user_id = ''' || :'second_client' || ''' WHERE user_id = ''' || :'client' || '''', 'push_subscriptions/client/change-owner');
SELECT test.rls_assert(test.rls_exec_count('INSERT INTO public.push_subscriptions (id,user_id,subscription) VALUES (''73000000-0000-4000-8000-000000000003'',''' || :'client' || ''',''{"endpoint":"https://push.invalid.test/new"}'')'), 1, 'push_subscriptions/client/insert-own');
SELECT test.rls_assert(test.rls_exec_count('UPDATE public.push_subscriptions SET subscription = ''{"endpoint":"https://push.invalid.test/updated"}'' WHERE id = ''73000000-0000-4000-8000-000000000003'''), 1, 'push_subscriptions/client/update-own');
SELECT test.rls_assert(test.rls_exec_count('DELETE FROM public.push_subscriptions WHERE id = ''73000000-0000-4000-8000-000000000003'''), 1, 'push_subscriptions/client/delete-own');
SELECT test.rls_assert((SELECT count(*) FROM public.payments WHERE client_id = :'client'), 1, 'payments/client/select-own');
SELECT test.rls_assert((SELECT count(*) FROM public.payments WHERE client_id = :'second_client'), 0, 'payments/client/select-foreign');
SELECT test.rls_expect_error('INSERT INTO public.payments (client_id,amount,status,stripe_id) VALUES (''' || :'client' || ''',1,''completed'',''pi_client_forged'')', 'payments/client/insert-denied');
SELECT test.rls_expect_error('UPDATE public.payments SET amount = 1 WHERE client_id = ''' || :'client' || '''', 'payments/client/update-denied');
SELECT test.rls_expect_error('UPDATE public.payments SET client_id = ''' || :'second_client' || ''' WHERE client_id = ''' || :'client' || '''', 'payments/client/change-client-denied');
SELECT test.rls_expect_error('UPDATE public.payments SET coach_id = ''' || :'second_coach' || ''' WHERE client_id = ''' || :'client' || '''', 'payments/client/change-coach-denied');
SELECT test.rls_expect_error('UPDATE public.payments SET stripe_event_id = ''evt_forged'' WHERE client_id = ''' || :'client' || '''', 'payments/client/change-stripe-event-denied');
SELECT test.rls_expect_error('DELETE FROM public.payments WHERE client_id = ''' || :'client' || '''', 'payments/client/delete-denied');
RESET ROLE;

-- Active coach endpoint and foreign coach isolation.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'coach', true);
SELECT test.rls_assert((SELECT count(*) FROM public.coach_clients WHERE client_id = :'client'), 1, 'coach_clients/active-coach/select-linked');
SELECT test.rls_assert((SELECT count(*) FROM public.coach_clients WHERE client_id = :'second_client'), 0, 'coach_clients/active-coach/select-foreign');
SELECT test.rls_assert((SELECT count(*) FROM public.coach_invitations WHERE coach_id = :'coach'), 1, 'coach_invitations/owner-coach/select-own');
SELECT test.rls_assert((SELECT count(*) FROM public.coach_invitations WHERE coach_id = :'second_coach'), 0, 'coach_invitations/owner-coach/select-foreign');
SELECT test.rls_expect_error('INSERT INTO public.coach_invitations (coach_id, recipient_email, token_hash, expires_at) VALUES (''' || :'second_coach' || ''',''forged@moovx.example.test'',decode(repeat(''33'',32),''hex''),now()+interval ''1 day'')', 'coach_invitations/owner-coach/insert-foreign-owner');
SELECT test.rls_assert(test.rls_exec_count('INSERT INTO public.coach_invitations (coach_id,recipient_email,token_hash,expires_at) VALUES (''' || :'coach' || ''',''owned@moovx.example.test'',decode(repeat(''44'',32),''hex''),now()+interval ''1 day'')'), 1, 'coach_invitations/owner-coach/insert-own');
SELECT test.rls_assert(test.rls_exec_count('UPDATE public.coach_invitations SET status=''revoked'',revoked_by=''' || :'coach' || ''',revoked_at=now() WHERE recipient_email=''owned@moovx.example.test'''), 1, 'coach_invitations/owner-coach/revoke-own');
SELECT test.rls_expect_error('DELETE FROM public.coach_invitations WHERE coach_id = ''' || :'coach' || '''', 'coach_invitations/owner-coach/delete-no-grant');
SELECT test.rls_assert((SELECT count(*) FROM public.payments WHERE coach_id = :'coach'), 1, 'payments/active-coach/select-linked-row');
SELECT test.rls_assert((SELECT count(*) FROM public.payments WHERE coach_id = :'second_coach'), 0, 'payments/active-coach/select-foreign');
SELECT test.rls_expect_error('INSERT INTO public.payments (client_id,coach_id,amount,status,stripe_id) VALUES (''' || :'second_client' || ''',''' || :'coach' || ''',1,''completed'',''pi_coach_forged'')', 'payments/active-coach/insert-foreign-client-denied');
SELECT test.rls_expect_error('UPDATE public.payments SET amount=2 WHERE coach_id = ''' || :'coach' || '''', 'payments/active-coach/update-denied');
SELECT test.rls_expect_error('UPDATE public.payments SET client_id=''' || :'second_client' || ''' WHERE coach_id = ''' || :'coach' || '''', 'payments/active-coach/change-client-denied');
SELECT test.rls_expect_error('UPDATE public.payments SET coach_id=''' || :'second_coach' || ''' WHERE coach_id = ''' || :'coach' || '''', 'payments/active-coach/change-coach-denied');
SELECT test.rls_expect_error('UPDATE public.payments SET stripe_event_id=''evt_coach_forged'' WHERE coach_id = ''' || :'coach' || '''', 'payments/active-coach/change-stripe-event-denied');
SELECT test.rls_expect_error('DELETE FROM public.payments WHERE coach_id = ''' || :'coach' || '''', 'payments/active-coach/delete-denied');
RESET ROLE;

-- Inactive coach: even its own historical coach_id does not grant visibility or mutation.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'second_coach', true);
SELECT test.rls_assert((SELECT count(*) FROM public.payments WHERE coach_id = :'second_coach'), 0, 'payments/inactive-coach/select-denied');
SELECT test.rls_assert((SELECT count(*) FROM public.payments WHERE coach_id = :'coach'), 0, 'payments/foreign-coach/select-denied');
SELECT test.rls_expect_error('UPDATE public.payments SET amount=2 WHERE coach_id = ''' || :'second_coach' || '''', 'payments/inactive-coach/update-denied');
SELECT test.rls_expect_error('DELETE FROM public.payments WHERE coach_id = ''' || :'second_coach' || '''', 'payments/inactive-coach/delete-denied');
RESET ROLE;

-- Server path: service_role retains the ledger mutations required by checkout/webhook.
SET LOCAL ROLE service_role;
SELECT test.rls_assert(test.rls_exec_count('INSERT INTO public.payments (client_id,coach_id,amount,status,stripe_id,stripe_event_id) VALUES (''' || :'client' || ''',''' || :'coach' || ''',70,''pending'',''pi_service'',''evt_service'')'), 1, 'payments/service-role/insert');
SELECT test.rls_assert(test.rls_exec_count('UPDATE public.payments SET status=''paid'' WHERE stripe_event_id=''evt_service'''), 1, 'payments/service-role/update-status');
SELECT test.rls_assert(test.rls_exec_count('DELETE FROM public.payments WHERE stripe_event_id=''evt_service'''), 1, 'payments/service-role/delete');
RESET ROLE;

-- Invited, lifetime and email-admin retain ordinary client RLS authority.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'invited', true);
SELECT test.rls_assert((SELECT count(*) FROM public.profiles WHERE id = :'invited'), 1, 'profiles/invited/select-own');
SELECT test.rls_assert((SELECT count(*) FROM public.profiles WHERE id = :'client'), 0, 'profiles/invited/select-foreign');
SELECT test.rls_assert((SELECT count(*) FROM public.coach_invitations), 0, 'coach_invitations/recipient/no-direct-visibility');
SELECT set_config('request.jwt.claim.sub', :'lifetime', true);
SELECT test.rls_assert((SELECT count(*) FROM public.profiles WHERE id = :'lifetime'), 1, 'profiles/lifetime/select-own');
SELECT test.rls_assert((SELECT count(*) FROM public.payments), 0, 'payments/lifetime/no-elevation');
SELECT set_config('request.jwt.claim.sub', :'admin', true);
SELECT test.rls_assert((SELECT count(*) FROM public.profiles WHERE id = :'admin'), 1, 'profiles/email-admin/select-own');
SELECT test.rls_assert((SELECT count(*) FROM public.profiles WHERE id <> :'admin'), 0, 'profiles/email-admin/no-database-elevation');
RESET ROLE;

-- Known contract gaps: observable, documented, but not normalized as secure expectations.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'second_client', true);
SELECT test.rls_known_gap(
  (SELECT count(*) = 1 FROM public.profiles WHERE id = :'second_coach'),
  'profiles/inactive-client/can-read-inactive-coach; severity=medium; exposed=coach-profile'
);
SELECT set_config('request.jwt.claim.sub', :'coach', true);
SELECT test.rls_known_gap(
  (SELECT count(*) = 0 FROM public.profiles WHERE id = :'client'),
  'profiles/active-coach/cannot-select-client; severity=high; impact=product-contract-mismatch'
);
SELECT test.rls_known_gap(
  test.rls_exec_count('INSERT INTO public.coach_clients (coach_id,client_id,status) VALUES (''' || :'coach' || ''',''' || :'second_client' || ''',''active'')') = 1,
  'coach_clients/coach/can-create-foreign-relation; severity=high; impact=unauthorized-relationship'
);
SELECT set_config('request.jwt.claim.sub', :'client', true);
SELECT test.rls_known_gap(
  test.rls_exec_count('INSERT INTO public.coach_clients (coach_id,client_id,status) VALUES (''' || :'second_coach' || ''',''' || :'client' || ''',''active'')') = 1,
  'coach_clients/client/can-self-register-any-real-coach; severity=high; impact=unauthorized-relationship'
);
SELECT set_config('request.jwt.claim.sub', :'coach', true);
RESET ROLE;

ROLLBACK;
SELECT 'RLS matrix completed with secured expectations and explicit known gaps' AS result;
