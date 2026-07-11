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
  EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid = 'public.is_coach_role(uuid)'::regprocedure
  ),
  'historical SECURITY DEFINER helper must parse and exist'
);

SELECT 'Supabase structural baseline assertions passed' AS result;
