-- Prepare coach_clients to become a history of coaching relationship periods.
-- This migration intentionally leaves invited_by_coach and subscription data
-- untouched. Application writer cutover is handled separately.

ALTER TABLE public.coach_clients
  ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.coach_clients
  ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.coach_clients
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_by uuid,
  ADD COLUMN IF NOT EXISTS end_reason text;

-- Existing rows predate durable provenance. Do not infer source from
-- invited_by_coach or subscription fields.
UPDATE public.coach_clients
SET status = 'active'
WHERE status IS NULL;

UPDATE public.coach_clients
SET source = 'legacy'
WHERE source IS NULL;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.coach_clients
    WHERE created_at IS NULL
  ) THEN
    RAISE EXCEPTION 'COACH_CLIENTS_CREATED_AT_REQUIRED_FOR_BACKFILL';
  END IF;
END
$block$;

UPDATE public.coach_clients
SET started_at = created_at
WHERE started_at IS NULL;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.coach_clients
    WHERE status NOT IN ('active', 'ended')
  ) THEN
    RAISE EXCEPTION 'COACH_CLIENTS_INVALID_STATUS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.coach_clients
    WHERE source NOT IN ('default', 'invitation', 'admin', 'legacy')
  ) THEN
    RAISE EXCEPTION 'COACH_CLIENTS_INVALID_SOURCE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.coach_clients
    WHERE end_reason IS NOT NULL
      AND end_reason NOT IN (
        'client_request',
        'coach_request',
        'replaced',
        'admin_action',
        'legacy_reconciliation'
      )
  ) THEN
    RAISE EXCEPTION 'COACH_CLIENTS_INVALID_END_REASON';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.coach_clients
    WHERE NOT (
      (
        status = 'active'
        AND ended_at IS NULL
        AND ended_by IS NULL
        AND end_reason IS NULL
      )
      OR
      (
        status = 'ended'
        AND ended_at IS NOT NULL
        AND end_reason IS NOT NULL
        AND ended_at >= started_at
      )
    )
  ) THEN
    RAISE EXCEPTION 'COACH_CLIENTS_INVALID_LIFECYCLE';
  END IF;
END
$block$;

ALTER TABLE public.coach_clients
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN source SET NOT NULL,
  ALTER COLUMN started_at SET NOT NULL;

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.coach_clients'::regclass
      AND conname = 'coach_clients_status_valid'
  ) THEN
    ALTER TABLE public.coach_clients
      ADD CONSTRAINT coach_clients_status_valid
      CHECK (status IN ('active', 'ended')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.coach_clients'::regclass
      AND conname = 'coach_clients_source_valid'
  ) THEN
    ALTER TABLE public.coach_clients
      ADD CONSTRAINT coach_clients_source_valid
      CHECK (source IN ('default', 'invitation', 'admin', 'legacy')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.coach_clients'::regclass
      AND conname = 'coach_clients_end_reason_valid'
  ) THEN
    ALTER TABLE public.coach_clients
      ADD CONSTRAINT coach_clients_end_reason_valid
      CHECK (
        end_reason IS NULL
        OR end_reason IN (
          'client_request',
          'coach_request',
          'replaced',
          'admin_action',
          'legacy_reconciliation'
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.coach_clients'::regclass
      AND conname = 'coach_clients_lifecycle_valid'
  ) THEN
    ALTER TABLE public.coach_clients
      ADD CONSTRAINT coach_clients_lifecycle_valid
      CHECK (
        (
          status = 'active'
          AND ended_at IS NULL
          AND ended_by IS NULL
          AND end_reason IS NULL
        )
        OR
        (
          status = 'ended'
          AND ended_at IS NOT NULL
          AND end_reason IS NOT NULL
          AND ended_at >= started_at
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.coach_clients'::regclass
      AND conname = 'coach_clients_ended_by_fkey'
  ) THEN
    ALTER TABLE public.coach_clients
      ADD CONSTRAINT coach_clients_ended_by_fkey
      FOREIGN KEY (ended_by)
      REFERENCES auth.users(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END
$block$;

ALTER TABLE public.coach_clients
  VALIDATE CONSTRAINT coach_clients_status_valid,
  VALIDATE CONSTRAINT coach_clients_source_valid,
  VALIDATE CONSTRAINT coach_clients_end_reason_valid,
  VALIDATE CONSTRAINT coach_clients_lifecycle_valid,
  VALIDATE CONSTRAINT coach_clients_ended_by_fkey;

CREATE INDEX IF NOT EXISTS coach_clients_coach_status_idx
  ON public.coach_clients (coach_id, status);

CREATE INDEX IF NOT EXISTS coach_clients_client_status_idx
  ON public.coach_clients (client_id, status);

CREATE INDEX IF NOT EXISTS coach_clients_pair_history_idx
  ON public.coach_clients (coach_id, client_id, started_at DESC);

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.coach_clients
    WHERE status = 'active'
    GROUP BY client_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'COACH_CLIENTS_MULTIPLE_ACTIVE_RELATIONS';
  END IF;
END
$block$;

CREATE UNIQUE INDEX IF NOT EXISTS coach_clients_one_active_per_client_idx
  ON public.coach_clients (client_id)
  WHERE status = 'active';

DO $block$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS relation_index
    JOIN pg_attribute AS client_column
      ON client_column.attrelid = relation_index.indrelid
      AND client_column.attname = 'client_id'
    WHERE relation_index.indexrelid =
      'public.coach_clients_one_active_per_client_idx'::regclass
      AND relation_index.indisunique
      AND relation_index.indisvalid
      AND relation_index.indnkeyatts = 1
      AND relation_index.indkey::text = client_column.attnum::text
      AND pg_get_expr(relation_index.indpred, relation_index.indrelid) =
        '(status = ''active''::text)'
  ) THEN
    RAISE EXCEPTION 'COACH_CLIENTS_ACTIVE_UNIQUE_INDEX_REQUIRED';
  END IF;
END
$block$;

-- The active-client index now carries the runtime uniqueness guarantee. Drop
-- both historical pair constraints so a pair can have multiple time periods.
ALTER TABLE public.coach_clients
  DROP CONSTRAINT IF EXISTS coach_clients_coach_client_unique,
  DROP CONSTRAINT IF EXISTS coach_clients_coach_id_client_id_key;
