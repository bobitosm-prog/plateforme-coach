\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE coach_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  client_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'
);

DO $proof$
BEGIN
  IF (SELECT count(*) FROM coach_clients) <> 0 THEN
    RAISE EXCEPTION 'coach_clients must be empty before migration';
  END IF;
END
$proof$;

\ir ../../supabase/migrations/20260419_coach_clients_unique.sql

DO $proof$
DECLARE
  v_constraint_count integer;
BEGIN
  IF (SELECT count(*) FROM coach_clients) <> 0 THEN
    RAISE EXCEPTION 'coach_clients migration deleted or inserted rows';
  END IF;

  SELECT count(*) INTO v_constraint_count
  FROM pg_constraint
  WHERE conrelid = 'coach_clients'::regclass
    AND conname = 'coach_clients_coach_client_unique'
    AND contype = 'u';

  IF v_constraint_count <> 1 THEN
    RAISE EXCEPTION 'unique coach/client constraint was not created';
  END IF;
END
$proof$;

INSERT INTO coach_clients (coach_id, client_id)
VALUES
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002');

DO $proof$
BEGIN
  BEGIN
    INSERT INTO coach_clients (coach_id, client_id)
    VALUES (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'duplicate coach/client relation was accepted';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  IF (SELECT count(*) FROM coach_clients) <> 2 THEN
    RAISE EXCEPTION 'valid coach/client relations were altered';
  END IF;
END
$proof$;

-- Second replay proves the DROP/ADD guard remains safe with valid unique rows.
\ir ../../supabase/migrations/20260419_coach_clients_unique.sql

DO $proof$
BEGIN
  IF (SELECT count(*) FROM coach_clients) <> 2 THEN
    RAISE EXCEPTION 'second replay altered valid coach/client relations';
  END IF;
  RAISE NOTICE
    'coach_clients_unique proof: initial_rows=0 deleted=0 valid_rows=2 duplicate_refused=true constraint=true replay_safe=true';
END
$proof$;

ROLLBACK;
