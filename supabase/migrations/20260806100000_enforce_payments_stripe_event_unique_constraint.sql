-- Make the PostgREST ON CONFLICT(stripe_event_id) contract inferable while
-- preserving nullable event ids for payments that are not webhook-finalized.

DO $$
DECLARE
  existing_constraint text;
  existing_index record;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payments
    WHERE stripe_event_id IS NOT NULL
    GROUP BY stripe_event_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate stripe_event_id values exist';
  END IF;

  SELECT pg_get_constraintdef(oid)
  INTO existing_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.payments'::regclass
    AND conname = 'payments_stripe_event_id_key';

  IF existing_constraint IS NOT NULL THEN
    IF existing_constraint <> 'UNIQUE (stripe_event_id)' THEN
      RAISE EXCEPTION 'payments_stripe_event_id_key has an incompatible definition: %', existing_constraint;
    END IF;
    RETURN;
  END IF;

  SELECT
    index_definition.indisunique AS is_unique,
    index_definition.indpred IS NOT NULL AS is_partial,
    array_agg(attribute.attname ORDER BY key_column.ordinality) AS columns
  INTO existing_index
  FROM pg_class index_class
  JOIN pg_index index_definition
    ON index_definition.indexrelid = index_class.oid
  JOIN LATERAL unnest(index_definition.indkey)
    WITH ORDINALITY AS key_column(attnum, ordinality)
    ON true
  JOIN pg_attribute attribute
    ON attribute.attrelid = index_definition.indrelid
    AND attribute.attnum = key_column.attnum
  WHERE index_class.relnamespace = 'public'::regnamespace
    AND index_class.relname = 'payments_stripe_event_id_key'
  GROUP BY index_definition.indisunique, index_definition.indpred;

  IF FOUND THEN
    IF NOT existing_index.is_unique
      OR NOT existing_index.is_partial
      OR existing_index.columns <> ARRAY['stripe_event_id']::name[]
    THEN
      RAISE EXCEPTION 'payments_stripe_event_id_key index has an incompatible definition';
    END IF;
    DROP INDEX public.payments_stripe_event_id_key;
  END IF;

  ALTER TABLE public.payments
    ADD CONSTRAINT payments_stripe_event_id_key UNIQUE (stripe_event_id);
END
$$;
