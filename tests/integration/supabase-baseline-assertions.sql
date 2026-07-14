\set ON_ERROR_STOP on

CREATE SCHEMA IF NOT EXISTS test;

CREATE OR REPLACE FUNCTION test.assert(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERTION_FAILED: %', message;
  END IF;
END;
$$;

\ir test-personas.sql

SELECT test.assert((SELECT count(*) = 7 FROM test.personas), 'shared personas count mismatch');
SELECT test.assert(
  (SELECT role = 'client' AND subscription_type = 'invited' AND NOT is_admin FROM test.personas WHERE persona_name = 'invited'),
  'invited persona must be a client subscription state'
);
SELECT test.assert(
  (SELECT role = 'client' AND subscription_type = 'lifetime' AND subscription_status = 'lifetime' AND NOT is_admin FROM test.personas WHERE persona_name = 'lifetime'),
  'lifetime persona must be a client subscription state'
);
SELECT test.assert(
  (SELECT role = 'client' AND is_admin FROM test.personas WHERE persona_name = 'admin'),
  'admin authority must remain distinct from profile role'
);

SELECT test.seed_personas();
SELECT test.seed_personas(); -- profile/Auth seed is explicitly idempotent
SELECT test.set_persona_relation('coach', 'client', 'active');
SELECT test.assert(
  EXISTS (
    SELECT 1 FROM public.coach_clients relation
    JOIN test.personas coach ON coach.id = relation.coach_id AND coach.persona_name = 'coach'
    JOIN test.personas client ON client.id = relation.client_id AND client.persona_name = 'client'
    WHERE relation.status = 'active'
  ),
  'active shared persona relation missing'
);
SELECT test.set_persona_relation('coach', 'client', 'inactive');
SELECT test.assert(
  EXISTS (
    SELECT 1 FROM public.coach_clients relation
    JOIN test.personas coach ON coach.id = relation.coach_id AND coach.persona_name = 'coach'
    JOIN test.personas client ON client.id = relation.client_id AND client.persona_name = 'client'
    WHERE relation.status = 'inactive'
  ),
  'inactive shared persona relation missing'
);
SELECT test.cleanup_personas();
SELECT test.assert(NOT EXISTS (SELECT 1 FROM public.profiles WHERE id IN (SELECT id FROM test.personas)), 'persona profiles survived cleanup');
SELECT test.assert(NOT EXISTS (SELECT 1 FROM auth.users WHERE id IN (SELECT id FROM test.personas)), 'persona Auth users survived cleanup');

GRANT USAGE ON SCHEMA test TO authenticated;
GRANT EXECUTE ON FUNCTION test.assert(boolean, text) TO authenticated;

SELECT test.assert(to_regclass('public.profiles') IS NOT NULL, 'profiles must exist');
SELECT test.assert(to_regclass('public.messages') IS NOT NULL, 'messages must exist');
SELECT test.assert(to_regclass('public.coach_clients') IS NOT NULL, 'coach_clients must exist');
SELECT test.assert(to_regclass('public.daily_checkins') IS NOT NULL, 'daily_checkins must exist');
SELECT test.assert(to_regclass('public.meal_logs') IS NOT NULL, 'meal_logs must exist');

SELECT test.assert(
  (SELECT count(*) = 2
   FROM pg_constraint
   WHERE conrelid = 'public.messages'::regclass
     AND contype = 'f'
     AND confrelid = 'public.profiles'::regclass),
  'messages must retain both profile foreign keys'
);

SELECT test.assert(
  NOT EXISTS (
    SELECT required.column_name
    FROM (VALUES
      ('id'), ('email'), ('full_name'), ('role'), ('created_at'),
      ('subscription_status'), ('subscription_type'), ('trial_ends_at'),
      ('onboarding_completed'), ('training_location')
    ) AS required(column_name)
    LEFT JOIN information_schema.columns AS columns
      ON columns.table_schema = 'public'
     AND columns.table_name = 'profiles'
     AND columns.column_name = required.column_name
    WHERE columns.column_name IS NULL
  ),
  'profiles must contain baseline and incrementally added columns'
);

SELECT test.assert(
  NOT EXISTS (
    SELECT required.column_name
    FROM (VALUES
      ('user_id'), ('coach_id'), ('client_id'), ('scheduled_at'),
      ('scheduled_date'), ('duration_minutes'), ('duration_min')
    ) AS required(column_name)
    LEFT JOIN information_schema.columns AS columns
      ON columns.table_schema = 'public'
     AND columns.table_name = 'scheduled_sessions'
     AND columns.column_name = required.column_name
    WHERE columns.column_name IS NULL
  ),
  'scheduled_sessions must support both historical consumers'
);

SELECT test.assert(
  NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid = to_regprocedure('public.is_coach_role(uuid)')
  ),
  'obsolete browser-authority helper must be removed'
);

SELECT 'Supabase structural baseline assertions passed' AS result;
