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

-- Replace two overlapping FOR ALL policies with one explicit policy per
-- operation. Reads follow the client's current coach; mutations additionally
-- require the authenticated coach to remain the row's declared coach.
DROP POLICY IF EXISTS "client_meal_plans_coach_all"
  ON public.client_meal_plans;
DROP POLICY IF EXISTS "client_meal_plans_coach_write"
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
BEGIN
  SELECT count(*)
  INTO required_policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND (tablename, policyname, cmd) IN (
      ('daily_food_logs', 'daily_food_logs_coach_read', 'SELECT'),
      ('meal_logs', 'meal_logs_coach_read', 'SELECT'),
      ('meal_tracking', 'meal_tracking_coach_read', 'SELECT'),
      ('meal_plans', 'meal_plans_coach_select_active', 'SELECT'),
      ('meal_plans', 'meal_plans_coach_insert_active', 'INSERT'),
      ('meal_plans', 'meal_plans_coach_update_active', 'UPDATE'),
      ('meal_plans', 'meal_plans_coach_delete_active', 'DELETE'),
      ('client_meal_plans', 'client_meal_plans_coach_select_active', 'SELECT'),
      ('client_meal_plans', 'client_meal_plans_coach_insert_active', 'INSERT'),
      ('client_meal_plans', 'client_meal_plans_coach_update_active', 'UPDATE'),
      ('client_meal_plans', 'client_meal_plans_coach_delete_active', 'DELETE')
    )
    AND roles = ARRAY['authenticated']::name[]
    AND (
      coalesce(qual, '') LIKE '%is_active_coach_client_relation%'
      OR coalesce(with_check, '') LIKE '%is_active_coach_client_relation%'
    );

  IF required_policy_count <> 11 THEN
    RAISE EXCEPTION 'NUTRITION_ACTIVE_COACH_POLICIES_INCOMPLETE';
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
        coalesce(qual, '') LIKE '%coach_clients%'
        OR coalesce(with_check, '') LIKE '%coach_clients%'
        OR (
          (
            coalesce(qual, '') ~ 'auth\.uid\(\)\s*=\s*(?:[a-z_]+\.)?(?:coach_id|created_by)'
            OR coalesce(with_check, '') ~ 'auth\.uid\(\)\s*=\s*(?:[a-z_]+\.)?(?:coach_id|created_by)'
          )
          AND coalesce(qual, '') NOT LIKE '%is_active_coach_client_relation%'
          AND coalesce(with_check, '') NOT LIKE '%is_active_coach_client_relation%'
        )
      )
  ) THEN
    RAISE EXCEPTION 'NUTRITION_LEGACY_COACH_BYPASS_REMAINS';
  END IF;
END
$postflight$;

COMMIT;
