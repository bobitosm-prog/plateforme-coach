\set ON_ERROR_STOP on

BEGIN;

-- Disposable Production-like fixture. The cutover writer lock is bypassed
-- only inside this transaction so relation lifecycle states can be exercised.
ALTER TABLE public.coach_clients
  DISABLE TRIGGER rc1_guard_coach_clients_direct_write;

INSERT INTO auth.users (id, email)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'training-coach@test.invalid'),
  ('20000000-0000-0000-0000-000000000002', 'training-client@test.invalid'),
  ('20000000-0000-0000-0000-000000000003', 'training-other-client@test.invalid'),
  ('20000000-0000-0000-0000-000000000004', 'training-unrelated-coach@test.invalid');

INSERT INTO public.profiles (id, email, role)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'training-coach@test.invalid', 'coach'),
  ('20000000-0000-0000-0000-000000000002', 'training-client@test.invalid', 'client'),
  ('20000000-0000-0000-0000-000000000003', 'training-other-client@test.invalid', 'client'),
  ('20000000-0000-0000-0000-000000000004', 'training-unrelated-coach@test.invalid', 'coach');

INSERT INTO public.coach_clients (
  id, coach_id, client_id, status, source, started_at
)
VALUES (
  '20000000-0000-0000-0000-000000000010',
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  'active',
  'invitation',
  now()
);

ALTER TABLE public.coach_clients
  ENABLE TRIGGER rc1_guard_coach_clients_direct_write;

INSERT INTO public.scheduled_sessions (
  id, user_id, title, session_type, scheduled_date
)
VALUES
  ('20000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000002', 'Client row', 'custom', current_date),
  ('20000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000002', 'Coach update row', 'custom', current_date + 1),
  ('20000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000002', 'Coach delete row', 'custom', current_date + 2);

-- Client owns its calendar and can execute the complete CRUD contract.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);

DO $test$
DECLARE affected integer;
BEGIN
  SELECT count(*) INTO affected FROM public.scheduled_sessions
  WHERE id = '20000000-0000-0000-0000-000000000020';
  IF affected <> 1 THEN RAISE EXCEPTION 'CLIENT_OWN_SELECT_DENIED'; END IF;

  INSERT INTO public.scheduled_sessions (id, user_id, title, session_type, scheduled_date)
  VALUES ('20000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000002', 'Client CRUD', 'custom', current_date + 3);
  UPDATE public.scheduled_sessions SET notes = 'client-update'
  WHERE id = '20000000-0000-0000-0000-000000000023';
  DELETE FROM public.scheduled_sessions
  WHERE id = '20000000-0000-0000-0000-000000000023';
END
$test$;

-- A different client cannot read or mutate these rows.
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);

DO $test$
DECLARE affected integer;
BEGIN
  SELECT count(*) INTO affected FROM public.scheduled_sessions
  WHERE id = '20000000-0000-0000-0000-000000000020';
  IF affected <> 0 THEN RAISE EXCEPTION 'OTHER_CLIENT_SELECT_ALLOWED'; END IF;

  BEGIN
    INSERT INTO public.scheduled_sessions (id, user_id, title, session_type, scheduled_date)
    VALUES ('20000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000002', 'Forbidden', 'custom', current_date + 4);
    RAISE EXCEPTION 'OTHER_CLIENT_INSERT_ALLOWED';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
  END;

  UPDATE public.scheduled_sessions SET notes = 'forbidden'
  WHERE id = '20000000-0000-0000-0000-000000000020';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'OTHER_CLIENT_UPDATE_ALLOWED'; END IF;

  DELETE FROM public.scheduled_sessions
  WHERE id = '20000000-0000-0000-0000-000000000020';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'OTHER_CLIENT_DELETE_ALLOWED'; END IF;
END
$test$;

-- The active related coach receives the same CRUD surface through the helper.
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

DO $test$
DECLARE affected integer;
BEGIN
  SELECT count(*) INTO affected FROM public.scheduled_sessions
  WHERE id = '20000000-0000-0000-0000-000000000020';
  IF affected <> 1 THEN RAISE EXCEPTION 'ACTIVE_COACH_SELECT_DENIED'; END IF;

  INSERT INTO public.scheduled_sessions (id, user_id, title, session_type, scheduled_date)
  VALUES ('20000000-0000-0000-0000-000000000025', '20000000-0000-0000-0000-000000000002', 'Coach insert', 'custom', current_date + 5);

  UPDATE public.scheduled_sessions SET notes = 'coach-update'
  WHERE id = '20000000-0000-0000-0000-000000000021';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'ACTIVE_COACH_UPDATE_DENIED'; END IF;

  DELETE FROM public.scheduled_sessions
  WHERE id = '20000000-0000-0000-0000-000000000022';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'ACTIVE_COACH_DELETE_DENIED'; END IF;
END
$test$;

-- Ending the relation removes all coach authority immediately.
RESET ROLE;
ALTER TABLE public.coach_clients
  DISABLE TRIGGER rc1_guard_coach_clients_direct_write;
UPDATE public.coach_clients
SET status = 'ended', ended_at = now(), end_reason = 'coach_request'
WHERE id = '20000000-0000-0000-0000-000000000010';
ALTER TABLE public.coach_clients
  ENABLE TRIGGER rc1_guard_coach_clients_direct_write;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

DO $test$
DECLARE affected integer;
BEGIN
  SELECT count(*) INTO affected FROM public.scheduled_sessions
  WHERE id = '20000000-0000-0000-0000-000000000020';
  IF affected <> 0 THEN RAISE EXCEPTION 'ENDED_COACH_SELECT_ALLOWED'; END IF;

  BEGIN
    INSERT INTO public.scheduled_sessions (id, user_id, title, session_type, scheduled_date)
    VALUES ('20000000-0000-0000-0000-000000000026', '20000000-0000-0000-0000-000000000002', 'Forbidden', 'custom', current_date + 6);
    RAISE EXCEPTION 'ENDED_COACH_INSERT_ALLOWED';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
  END;

  UPDATE public.scheduled_sessions SET notes = 'forbidden'
  WHERE id = '20000000-0000-0000-0000-000000000020';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'ENDED_COACH_UPDATE_ALLOWED'; END IF;

  DELETE FROM public.scheduled_sessions
  WHERE id = '20000000-0000-0000-0000-000000000020';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'ENDED_COACH_DELETE_ALLOWED'; END IF;
END
$test$;

-- An unrelated coach and an anonymous caller remain denied.
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true);
DO $test$
DECLARE visible integer;
BEGIN
  SELECT count(*) INTO visible FROM public.scheduled_sessions
  WHERE id = '20000000-0000-0000-0000-000000000020';
  IF visible <> 0 THEN RAISE EXCEPTION 'UNRELATED_COACH_SELECT_ALLOWED'; END IF;
END
$test$;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
DO $test$
DECLARE visible integer;
BEGIN
  SELECT count(*) INTO visible FROM public.scheduled_sessions
  WHERE id = '20000000-0000-0000-0000-000000000020';
  IF visible <> 0 THEN RAISE EXCEPTION 'ANONYMOUS_SELECT_ALLOWED'; END IF;
END
$test$;

RESET ROLE;
ROLLBACK;
