BEGIN;

DO $preflight$
DECLARE
  target_table text;
BEGIN
  IF to_regprocedure(
    'public.is_active_coach_client_relation(uuid,uuid)'
  ) IS NULL THEN
    RAISE EXCEPTION 'NUTRITION_RLS_REQUIRES_ACTIVE_RELATION_HELPER';
  END IF;

  FOREACH target_table IN ARRAY ARRAY[
    'daily_food_logs',
    'meal_logs',
    'meal_tracking',
    'meal_plans',
    'client_meal_plans'
  ]
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NULL THEN
      RAISE EXCEPTION 'NUTRITION_RLS_REQUIRES_TABLE: %', target_table;
    END IF;
  END LOOP;
END
$preflight$;

-- Food intake and meal-compliance data remain owner-managed. Coaches only gain
-- read access while they have the active relation to the row's client.
DROP POLICY IF EXISTS "daily_food_logs_coach_read"
  ON public.daily_food_logs;
CREATE POLICY "daily_food_logs_coach_read"
ON public.daily_food_logs
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), daily_food_logs.user_id)
);

DROP POLICY IF EXISTS "meal_logs_coach_read"
  ON public.meal_logs;
CREATE POLICY "meal_logs_coach_read"
ON public.meal_logs
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), meal_logs.user_id)
);

DROP POLICY IF EXISTS "Coaches can view client meal tracking"
  ON public.meal_tracking;
DROP POLICY IF EXISTS "meal_tracking_coach_read"
  ON public.meal_tracking;
CREATE POLICY "meal_tracking_coach_read"
ON public.meal_tracking
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), meal_tracking.user_id)
);

-- user_id is the client target and created_by is only the author. There is no
-- demonstrated template contract in this table, so author identity alone must
-- never retain access to client-bound plans after a relation ends.
DROP POLICY IF EXISTS "meal_plans_coach_read"
  ON public.meal_plans;
DROP POLICY IF EXISTS "meal_plans_coach"
  ON public.meal_plans;

DROP POLICY IF EXISTS "meal_plans_coach_select_active"
  ON public.meal_plans;
CREATE POLICY "meal_plans_coach_select_active"
ON public.meal_plans
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), meal_plans.user_id)
);

DROP POLICY IF EXISTS "meal_plans_coach_insert_active"
  ON public.meal_plans;
CREATE POLICY "meal_plans_coach_insert_active"
ON public.meal_plans
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = meal_plans.created_by
  AND public.is_active_coach_client_relation(auth.uid(), meal_plans.user_id)
);

DROP POLICY IF EXISTS "meal_plans_coach_update_active"
  ON public.meal_plans;
CREATE POLICY "meal_plans_coach_update_active"
ON public.meal_plans
FOR UPDATE
TO authenticated
USING (
  auth.uid() = meal_plans.created_by
  AND public.is_active_coach_client_relation(auth.uid(), meal_plans.user_id)
)
WITH CHECK (
  auth.uid() = meal_plans.created_by
  AND public.is_active_coach_client_relation(auth.uid(), meal_plans.user_id)
);

DROP POLICY IF EXISTS "meal_plans_coach_delete_active"
  ON public.meal_plans;
CREATE POLICY "meal_plans_coach_delete_active"
ON public.meal_plans
FOR DELETE
TO authenticated
USING (
  auth.uid() = meal_plans.created_by
  AND public.is_active_coach_client_relation(auth.uid(), meal_plans.user_id)
);

-- Replace every historical coach-wide policy with one explicit policy per
-- operation. Reads follow the client's current coach; mutations additionally
-- require the authenticated coach to remain the row's declared coach.
DROP POLICY IF EXISTS "client_meal_plans_coach_all"
  ON public.client_meal_plans;
DROP POLICY IF EXISTS "client_meal_plans_coach_write"
  ON public.client_meal_plans;
DROP POLICY IF EXISTS "coaches manage meal plans"
  ON public.client_meal_plans;

DROP POLICY IF EXISTS "client_meal_plans_coach_select_active"
  ON public.client_meal_plans;
CREATE POLICY "client_meal_plans_coach_select_active"
ON public.client_meal_plans
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), client_meal_plans.client_id)
);

DROP POLICY IF EXISTS "client_meal_plans_coach_insert_active"
  ON public.client_meal_plans;
CREATE POLICY "client_meal_plans_coach_insert_active"
ON public.client_meal_plans
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = client_meal_plans.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    client_meal_plans.client_id
  )
);

DROP POLICY IF EXISTS "client_meal_plans_coach_update_active"
  ON public.client_meal_plans;
CREATE POLICY "client_meal_plans_coach_update_active"
ON public.client_meal_plans
FOR UPDATE
TO authenticated
USING (
  auth.uid() = client_meal_plans.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    client_meal_plans.client_id
  )
)
WITH CHECK (
  auth.uid() = client_meal_plans.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    client_meal_plans.client_id
  )
);

DROP POLICY IF EXISTS "client_meal_plans_coach_delete_active"
  ON public.client_meal_plans;
CREATE POLICY "client_meal_plans_coach_delete_active"
ON public.client_meal_plans
FOR DELETE
TO authenticated
USING (
  auth.uid() = client_meal_plans.coach_id
  AND public.is_active_coach_client_relation(
    auth.uid(),
    client_meal_plans.client_id
  )
);

DO $postflight$
DECLARE
  required_policy_count integer;
  nutrition_policy_count integer;
  legacy_bypass_count integer;
BEGIN
  WITH expected_policy(
    table_name,
    policy_name,
    command,
    using_expression,
    check_expression,
    helper_dependency_count
  ) AS (
    VALUES
      (
        'daily_food_logs',
        'daily_food_logs_coach_read',
        'r',
        'is_active_coach_client_relation(auth.uid(),user_id)',
        '',
        1
      ),
      (
        'meal_logs',
        'meal_logs_coach_read',
        'r',
        'is_active_coach_client_relation(auth.uid(),user_id)',
        '',
        1
      ),
      (
        'meal_tracking',
        'meal_tracking_coach_read',
        'r',
        'is_active_coach_client_relation(auth.uid(),user_id)',
        '',
        1
      ),
      (
        'meal_plans',
        'meal_plans_coach_select_active',
        'r',
        'is_active_coach_client_relation(auth.uid(),user_id)',
        '',
        1
      ),
      (
        'meal_plans',
        'meal_plans_coach_insert_active',
        'a',
        '',
        'auth.uid()=created_byandis_active_coach_client_relation(auth.uid(),user_id)',
        1
      ),
      (
        'meal_plans',
        'meal_plans_coach_update_active',
        'w',
        'auth.uid()=created_byandis_active_coach_client_relation(auth.uid(),user_id)',
        'auth.uid()=created_byandis_active_coach_client_relation(auth.uid(),user_id)',
        2
      ),
      (
        'meal_plans',
        'meal_plans_coach_delete_active',
        'd',
        'auth.uid()=created_byandis_active_coach_client_relation(auth.uid(),user_id)',
        '',
        1
      ),
      (
        'client_meal_plans',
        'client_meal_plans_coach_select_active',
        'r',
        'is_active_coach_client_relation(auth.uid(),client_id)',
        '',
        1
      ),
      (
        'client_meal_plans',
        'client_meal_plans_coach_insert_active',
        'a',
        '',
        'auth.uid()=coach_idandis_active_coach_client_relation(auth.uid(),client_id)',
        1
      ),
      (
        'client_meal_plans',
        'client_meal_plans_coach_update_active',
        'w',
        'auth.uid()=coach_idandis_active_coach_client_relation(auth.uid(),client_id)',
        'auth.uid()=coach_idandis_active_coach_client_relation(auth.uid(),client_id)',
        2
      ),
      (
        'client_meal_plans',
        'client_meal_plans_coach_delete_active',
        'd',
        'auth.uid()=coach_idandis_active_coach_client_relation(auth.uid(),client_id)',
        '',
        1
      )
  )
  SELECT count(*)
  INTO required_policy_count
  FROM expected_policy AS expected
  JOIN pg_catalog.pg_namespace AS namespace
    ON namespace.nspname = 'public'
  JOIN pg_catalog.pg_class AS relation
    ON relation.relnamespace = namespace.oid
    AND relation.relname = expected.table_name
  JOIN pg_catalog.pg_policy AS policy
    ON policy.polrelid = relation.oid
    AND policy.polname = expected.policy_name
  WHERE policy.polcmd = expected.command::"char"
    AND policy.polpermissive
    AND policy.polroles = ARRAY[
      (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
    ]::oid[]
    AND lower(regexp_replace(
      coalesce(pg_catalog.pg_get_expr(policy.polqual, policy.polrelid, true), ''),
      '[[:space:]]',
      '',
      'g'
    )) = expected.using_expression
    AND lower(regexp_replace(
      coalesce(pg_catalog.pg_get_expr(policy.polwithcheck, policy.polrelid, true), ''),
      '[[:space:]]',
      '',
      'g'
    )) = expected.check_expression
    AND (
      SELECT count(*)
      FROM pg_catalog.pg_depend AS dependency
      WHERE dependency.classid = 'pg_policy'::regclass
        AND dependency.objid = policy.oid
        AND dependency.refclassid = 'pg_proc'::regclass
        AND dependency.refobjid =
          'public.is_active_coach_client_relation(uuid,uuid)'::regprocedure
    ) = expected.helper_dependency_count;

  IF required_policy_count <> 11 THEN
    RAISE EXCEPTION 'NUTRITION_ACTIVE_COACH_POLICIES_INCOMPLETE: %',
      required_policy_count;
  END IF;

  SELECT count(*)
  INTO nutrition_policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND (tablename, policyname) IN (
      ('daily_food_logs', 'daily_food_logs_coach_read'),
      ('daily_food_logs', 'daily_food_logs_own'),
      ('daily_food_logs', 'users own logs'),
      ('meal_logs', 'meal_logs_coach_read'),
      ('meal_logs', 'own meal_logs'),
      ('meal_logs', 'users manage own meal logs'),
      ('meal_tracking', 'meal_tracking_coach_read'),
      ('meal_tracking', 'meal_tracking_own'),
      ('meal_tracking', 'users manage own tracking'),
      ('meal_plans', 'meal_plans_coach_select_active'),
      ('meal_plans', 'meal_plans_coach_insert_active'),
      ('meal_plans', 'meal_plans_coach_update_active'),
      ('meal_plans', 'meal_plans_coach_delete_active'),
      ('meal_plans', 'meal_plans_own'),
      ('meal_plans', 'users see own meal plans'),
      ('client_meal_plans', 'client_meal_plans_coach_select_active'),
      ('client_meal_plans', 'client_meal_plans_coach_insert_active'),
      ('client_meal_plans', 'client_meal_plans_coach_update_active'),
      ('client_meal_plans', 'client_meal_plans_coach_delete_active'),
      ('client_meal_plans', 'client_meal_plans_client_read'),
      ('client_meal_plans', 'clients read own meal plan')
    );

  IF nutrition_policy_count <> 21 OR (
    SELECT count(*)
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'daily_food_logs',
        'meal_logs',
        'meal_tracking',
        'meal_plans',
        'client_meal_plans'
      )
  ) <> 21 THEN
    RAISE EXCEPTION 'NUTRITION_POLICY_SET_INVALID';
  END IF;

  SELECT count(*)
  INTO legacy_bypass_count
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

  IF legacy_bypass_count <> 0 THEN
    RAISE EXCEPTION 'NUTRITION_LEGACY_COACH_BYPASS_REMAINS: %',
      legacy_bypass_count;
  END IF;

  IF EXISTS (
    SELECT 1
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
        lower(btrim(coalesce(qual, ''))) = 'true'
        OR lower(btrim(coalesce(with_check, ''))) = 'true'
      )
  ) THEN
    RAISE EXCEPTION 'NUTRITION_UNRESTRICTED_POLICY_REMAINS';
  END IF;
END
$postflight$;

COMMIT;
