\set ON_ERROR_STOP on

BEGIN;

-- Disposable Production-like fixtures. The cutover lock is bypassed only
-- inside this transaction to create the relation needed by the RLS matrix.
ALTER TABLE public.coach_clients
  DISABLE TRIGGER rc1_guard_coach_clients_direct_write;

INSERT INTO auth.users (id, email)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'payments-coach@test.invalid'),
  ('40000000-0000-0000-0000-000000000002', 'payments-client@test.invalid'),
  ('40000000-0000-0000-0000-000000000003', 'payments-other@test.invalid');

INSERT INTO public.profiles (id, email, role)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'payments-coach@test.invalid', 'coach'),
  ('40000000-0000-0000-0000-000000000002', 'payments-client@test.invalid', 'client'),
  ('40000000-0000-0000-0000-000000000003', 'payments-other@test.invalid', 'client');

INSERT INTO public.coach_clients (
  id, coach_id, client_id, status, source, started_at
)
VALUES (
  '40000000-0000-0000-0000-000000000010',
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  'active',
  'legacy',
  now()
);

ALTER TABLE public.coach_clients
  ENABLE TRIGGER rc1_guard_coach_clients_direct_write;

INSERT INTO public.payments (
  id, coach_id, client_id, amount, currency, status, description
)
VALUES (
  '40000000-0000-0000-0000-000000000020',
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  10,
  'chf',
  'paid',
  'Disposable RLS fixture'
);

INSERT INTO public.stripe_webhook_events (
  event_id, event_type, payload, processing_status
)
VALUES (
  'evt_disposable_payments_rls',
  'test.disposable',
  '{}'::jsonb,
  'success'
);

-- Anonymous callers cannot observe either sensitive table and have no writes.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);

DO $test$
DECLARE visible integer;
BEGIN
  SELECT count(*) INTO visible
  FROM public.payments
  WHERE id = '40000000-0000-0000-0000-000000000020';
  IF visible <> 0 THEN RAISE EXCEPTION 'ANON_PAYMENT_SELECT_ALLOWED'; END IF;

  BEGIN
    INSERT INTO public.payments (coach_id, client_id, amount)
    VALUES (
      '40000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000002',
      1
    );
    RAISE EXCEPTION 'ANON_PAYMENT_INSERT_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM 1 FROM public.stripe_webhook_events;
    RAISE EXCEPTION 'ANON_WEBHOOK_SELECT_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$test$;

-- The client can read only its own payment and cannot mutate payments.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000002',
  true
);

DO $test$
DECLARE visible integer;
BEGIN
  SELECT count(*) INTO visible
  FROM public.payments
  WHERE id = '40000000-0000-0000-0000-000000000020';
  IF visible <> 1 THEN RAISE EXCEPTION 'OWNER_PAYMENT_SELECT_DENIED'; END IF;

  BEGIN
    INSERT INTO public.payments (coach_id, client_id, amount)
    VALUES (
      '40000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000002',
      1
    );
    RAISE EXCEPTION 'AUTH_PAYMENT_INSERT_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.payments SET description = 'forbidden'
    WHERE id = '40000000-0000-0000-0000-000000000020';
    RAISE EXCEPTION 'AUTH_PAYMENT_UPDATE_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM public.payments
    WHERE id = '40000000-0000-0000-0000-000000000020';
    RAISE EXCEPTION 'AUTH_PAYMENT_DELETE_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM 1 FROM public.stripe_webhook_events;
    RAISE EXCEPTION 'AUTH_WEBHOOK_SELECT_ALLOWED';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END
$test$;

-- An unrelated authenticated user sees no payment row.
SELECT set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000003',
  true
);

DO $test$
DECLARE visible integer;
BEGIN
  SELECT count(*) INTO visible
  FROM public.payments
  WHERE id = '40000000-0000-0000-0000-000000000020';
  IF visible <> 0 THEN RAISE EXCEPTION 'UNRELATED_PAYMENT_SELECT_ALLOWED'; END IF;
END
$test$;

-- The row coach reads only through the active relation helper.
SELECT set_config(
  'request.jwt.claim.sub',
  '40000000-0000-0000-0000-000000000001',
  true
);

DO $test$
DECLARE visible integer;
BEGIN
  SELECT count(*) INTO visible
  FROM public.payments
  WHERE id = '40000000-0000-0000-0000-000000000020';
  IF visible <> 1 THEN RAISE EXCEPTION 'ACTIVE_COACH_PAYMENT_SELECT_DENIED'; END IF;
END
$test$;

-- service_role retains the server-side payment and webhook contract.
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.sub', '', true);

DO $test$
DECLARE visible integer;
BEGIN
  SELECT count(*) INTO visible
  FROM public.payments
  WHERE id = '40000000-0000-0000-0000-000000000020';
  IF visible <> 1 THEN RAISE EXCEPTION 'SERVICE_PAYMENT_SELECT_DENIED'; END IF;

  INSERT INTO public.payments (
    id, coach_id, client_id, amount, currency, status
  ) VALUES (
    '40000000-0000-0000-0000-000000000021',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    1,
    'chf',
    'pending'
  );
  UPDATE public.payments SET description = 'server-path'
  WHERE id = '40000000-0000-0000-0000-000000000021';
  DELETE FROM public.payments
  WHERE id = '40000000-0000-0000-0000-000000000021';

  SELECT count(*) INTO visible
  FROM public.stripe_webhook_events
  WHERE event_id = 'evt_disposable_payments_rls';
  IF visible <> 1 THEN RAISE EXCEPTION 'SERVICE_WEBHOOK_SELECT_DENIED'; END IF;

  INSERT INTO public.stripe_webhook_events (
    event_id, event_type, payload, processing_status
  ) VALUES (
    'evt_disposable_server_path',
    'test.disposable',
    '{}'::jsonb,
    'success'
  );
  UPDATE public.stripe_webhook_events SET processing_status = 'skipped'
  WHERE event_id = 'evt_disposable_server_path';
  DELETE FROM public.stripe_webhook_events
  WHERE event_id = 'evt_disposable_server_path';
END
$test$;

RESET ROLE;
ROLLBACK;
