\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  constraint_definition text;
  index_is_partial boolean;
BEGIN
  SELECT pg_get_constraintdef(oid)
  INTO constraint_definition
  FROM pg_constraint
  WHERE conrelid = 'public.payments'::regclass
    AND conname = 'payments_stripe_event_id_key';
  ASSERT constraint_definition = 'UNIQUE (stripe_event_id)',
    format('unexpected constraint definition: %s', constraint_definition);

  SELECT index_definition.indpred IS NOT NULL
  INTO index_is_partial
  FROM pg_class index_class
  JOIN pg_index index_definition ON index_definition.indexrelid = index_class.oid
  WHERE index_class.relnamespace = 'public'::regnamespace
    AND index_class.relname = 'payments_stripe_event_id_key';
  ASSERT index_is_partial = false, 'stripe_event_id unique index must not be partial';
END
$$;

INSERT INTO public.payments (id, amount, stripe_event_id)
VALUES
  ('86000000-0000-4000-8000-000000000001', 10, NULL),
  ('86000000-0000-4000-8000-000000000002', 10, NULL);

INSERT INTO public.payments (id, amount, stripe_event_id)
VALUES ('86000000-0000-4000-8000-000000000003', 10, 'evt_constraint_contract')
ON CONFLICT (stripe_event_id) DO NOTHING;

INSERT INTO public.payments (id, amount, stripe_event_id)
VALUES ('86000000-0000-4000-8000-000000000004', 10, 'evt_constraint_contract')
ON CONFLICT (stripe_event_id) DO NOTHING;

DO $$
DECLARE
  event_count integer;
BEGIN
  SELECT count(*) INTO event_count
  FROM public.payments
  WHERE stripe_event_id = 'evt_constraint_contract';
  ASSERT event_count = 1, format('expected one idempotent payment, got %s', event_count);

  BEGIN
    INSERT INTO public.payments (id, amount, stripe_event_id)
    VALUES ('86000000-0000-4000-8000-000000000005', 10, 'evt_constraint_contract');
    RAISE EXCEPTION 'duplicate non-null stripe_event_id was accepted';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;
END
$$;

ROLLBACK;
