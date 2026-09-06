\set ON_ERROR_STOP on

BEGIN;

-- This test runs after migrations 1-5 on a disposable pre-RC baseline. All
-- fixtures and mutations are rolled back, including the relation lifecycle.
INSERT INTO auth.users (id, email)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'nutrition-coach@test.invalid'),
  ('10000000-0000-0000-0000-000000000002', 'nutrition-client@test.invalid'),
  ('10000000-0000-0000-0000-000000000003', 'nutrition-unrelated@test.invalid');

INSERT INTO public.profiles (id, email, role)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'nutrition-coach@test.invalid', 'coach'),
  ('10000000-0000-0000-0000-000000000002', 'nutrition-client@test.invalid', 'client'),
  ('10000000-0000-0000-0000-000000000003', 'nutrition-unrelated@test.invalid', 'coach');

INSERT INTO public.coach_clients (
  id,
  coach_id,
  client_id,
  status,
  source,
  started_at
)
VALUES (
  '10000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'active',
  'legacy',
  now()
);

INSERT INTO public.client_meal_plans (
  id,
  coach_id,
  client_id,
  week_start,
  calorie_target
)
VALUES (
  '10000000-0000-0000-0000-000000000020',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  current_date,
  2000
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);

DO $test$
DECLARE
  affected integer;
BEGIN
  SELECT count(*) INTO affected
  FROM public.client_meal_plans
  WHERE id = '10000000-0000-0000-0000-000000000020';
  IF affected <> 1 THEN
    RAISE EXCEPTION 'ACTIVE_COACH_SELECT_DENIED';
  END IF;

  INSERT INTO public.client_meal_plans (
    id,
    coach_id,
    client_id,
    week_start,
    calorie_target
  )
  VALUES (
    '10000000-0000-0000-0000-000000000021',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    current_date + 7,
    2100
  );
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'ACTIVE_COACH_INSERT_DENIED';
  END IF;

  UPDATE public.client_meal_plans
  SET calorie_target = 2200
  WHERE id = '10000000-0000-0000-0000-000000000021';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'ACTIVE_COACH_UPDATE_DENIED';
  END IF;

  DELETE FROM public.client_meal_plans
  WHERE id = '10000000-0000-0000-0000-000000000021';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'ACTIVE_COACH_DELETE_DENIED';
  END IF;
END
$test$;

RESET ROLE;
UPDATE public.coach_clients
SET
  status = 'ended',
  ended_at = now(),
  ended_by = '10000000-0000-0000-0000-000000000001',
  end_reason = 'coach_request'
WHERE id = '10000000-0000-0000-0000-000000000010';

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);

DO $test$
DECLARE
  affected integer;
BEGIN
  SELECT count(*) INTO affected
  FROM public.client_meal_plans
  WHERE id = '10000000-0000-0000-0000-000000000020';
  IF affected <> 0 THEN
    RAISE EXCEPTION 'ENDED_COACH_SELECT_ALLOWED';
  END IF;

  BEGIN
    INSERT INTO public.client_meal_plans (
      id,
      coach_id,
      client_id,
      week_start
    )
    VALUES (
      '10000000-0000-0000-0000-000000000022',
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      current_date + 14
    );
    RAISE EXCEPTION 'ENDED_COACH_INSERT_ALLOWED';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN NULL;
  END;

  UPDATE public.client_meal_plans
  SET calorie_target = 2300
  WHERE id = '10000000-0000-0000-0000-000000000020';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'ENDED_COACH_UPDATE_ALLOWED';
  END IF;

  DELETE FROM public.client_meal_plans
  WHERE id = '10000000-0000-0000-0000-000000000020';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'ENDED_COACH_DELETE_ALLOWED';
  END IF;
END
$test$;

SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000003',
  true
);

DO $test$
DECLARE
  visible integer;
BEGIN
  SELECT count(*) INTO visible
  FROM public.client_meal_plans
  WHERE id = '10000000-0000-0000-0000-000000000020';
  IF visible <> 0 THEN
    RAISE EXCEPTION 'UNRELATED_COACH_SELECT_ALLOWED';
  END IF;
END
$test$;

SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000002',
  true
);

DO $test$
DECLARE
  visible integer;
BEGIN
  SELECT count(*) INTO visible
  FROM public.client_meal_plans
  WHERE id = '10000000-0000-0000-0000-000000000020';
  IF visible <> 1 THEN
    RAISE EXCEPTION 'CLIENT_OWN_SELECT_DENIED';
  END IF;
END
$test$;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);

DO $test$
DECLARE
  visible integer;
BEGIN
  SELECT count(*) INTO visible
  FROM public.client_meal_plans
  WHERE id = '10000000-0000-0000-0000-000000000020';
  IF visible <> 0 THEN
    RAISE EXCEPTION 'ANONYMOUS_SELECT_ALLOWED';
  END IF;
END
$test$;

RESET ROLE;

DO $test$
DECLARE
  legacy_policy_count integer;
BEGIN
  SELECT count(*) INTO legacy_policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'daily_food_logs',
      'meal_logs',
      'meal_tracking',
      'meal_plans',
      'client_meal_plans'
    )
    AND (
      policyname IN (
        'Coaches can view client meal tracking',
        'meal_plans_coach',
        'meal_plans_coach_read',
        'client_meal_plans_coach_all',
        'client_meal_plans_coach_write',
        'coaches manage meal plans'
      )
      OR coalesce(qual, '') LIKE '%coach_clients%'
      OR coalesce(with_check, '') LIKE '%coach_clients%'
      OR (
        coalesce(qual, '')
          ~* '(auth\.uid\(\).{0,120}(coach_id|created_by)|(coach_id|created_by).{0,120}auth\.uid\(\))'
        AND coalesce(qual, '')
          NOT LIKE '%is_active_coach_client_relation%'
      )
      OR (
        coalesce(with_check, '')
          ~* '(auth\.uid\(\).{0,120}(coach_id|created_by)|(coach_id|created_by).{0,120}auth\.uid\(\))'
        AND coalesce(with_check, '')
          NOT LIKE '%is_active_coach_client_relation%'
      )
    );

  IF legacy_policy_count <> 0 THEN
    RAISE EXCEPTION 'NUTRITION_LEGACY_POLICY_REMAINS: %', legacy_policy_count;
  END IF;
END
$test$;

ROLLBACK;
