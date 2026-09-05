BEGIN;

DO $preflight$
DECLARE
  target_table text;
  target_function text;
BEGIN
  IF to_regprocedure(
    'public.is_active_coach_client_relation(uuid,uuid)'
  ) IS NULL THEN
    RAISE EXCEPTION 'PAYMENTS_GRANTS_REQUIRES_ACTIVE_RELATION_HELPER';
  END IF;

  IF to_regprocedure(
    'public.is_active_messaging_pair(uuid,uuid)'
  ) IS NULL THEN
    RAISE EXCEPTION 'PAYMENTS_GRANTS_REQUIRES_MESSAGING_PAIR_HELPER';
  END IF;

  FOREACH target_table IN ARRAY ARRAY[
    'coach_clients',
    'profiles',
    'workout_sessions',
    'workout_sets',
    'custom_programs',
    'training_programs',
    'client_programs',
    'completed_sessions',
    'personal_records',
    'exercise_feedback',
    'scheduled_sessions',
    'daily_food_logs',
    'meal_logs',
    'meal_tracking',
    'meal_plans',
    'client_meal_plans',
    'weight_logs',
    'body_measurements',
    'progress_photos',
    'daily_checkins',
    'messages',
    'coach_notes',
    'coach_appointments',
    'activity_feed',
    'payments',
    'stripe_webhook_events'
  ]
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NULL THEN
      RAISE EXCEPTION 'PAYMENTS_GRANTS_REQUIRES_TABLE: %', target_table;
    END IF;
  END LOOP;

  FOREACH target_function IN ARRAY ARRAY[
    'public.get_workout_session_summary(uuid,uuid)',
    'public.delete_user_account(uuid)',
    'public.set_role(text)'
  ]
  LOOP
    IF to_regprocedure(target_function) IS NULL THEN
      RAISE EXCEPTION 'PAYMENTS_GRANTS_REQUIRES_FUNCTION: %', target_function;
    END IF;
  END LOOP;
END
$preflight$;

DROP POLICY IF EXISTS "payments_client_read" ON public.payments;
DROP POLICY IF EXISTS "payments_client_select_own" ON public.payments;
CREATE POLICY "payments_client_select_own"
ON public.payments
FOR SELECT
TO authenticated
USING (payments.client_id = auth.uid());

DROP POLICY IF EXISTS "payments_coach_all" ON public.payments;
DROP POLICY IF EXISTS "coach see own payments" ON public.payments;
DROP POLICY IF EXISTS "Coaches can view their payments" ON public.payments;
DROP POLICY IF EXISTS "payments_coach_select_active_clients" ON public.payments;
CREATE POLICY "payments_coach_select_active_clients"
ON public.payments
FOR SELECT
TO authenticated
USING (
  payments.coach_id = auth.uid()
  AND public.is_active_coach_client_relation(
    auth.uid(),
    payments.client_id
  )
);

-- Payment writes are server-only. Stripe and server writers retain the
-- service_role privileges and RLS bypass; browser roles retain SELECT only.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.payments FROM anon, authenticated;

-- Stripe webhook idempotency is exclusively managed by the server-side
-- service_role client. Browser roles do not need read or write access.
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.stripe_webhook_events
FROM anon, authenticated;

-- Remove administrative table privileges from browser roles on the explicit
-- application-table allowlist. service_role is intentionally untouched.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.coach_clients,
  public.profiles,
  public.workout_sessions,
  public.workout_sets,
  public.custom_programs,
  public.training_programs,
  public.client_programs,
  public.completed_sessions,
  public.personal_records,
  public.exercise_feedback,
  public.scheduled_sessions,
  public.daily_food_logs,
  public.meal_logs,
  public.meal_tracking,
  public.meal_plans,
  public.client_meal_plans,
  public.weight_logs,
  public.body_measurements,
  public.progress_photos,
  public.daily_checkins,
  public.messages,
  public.coach_notes,
  public.coach_appointments,
  public.activity_feed,
  public.payments
FROM anon, authenticated;

-- No audited public surface performs anonymous business-table mutations.
-- SELECT is deliberately preserved for RLS-governed public read contracts,
-- including public training templates.
REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.coach_clients,
  public.profiles,
  public.workout_sessions,
  public.workout_sets,
  public.custom_programs,
  public.training_programs,
  public.client_programs,
  public.completed_sessions,
  public.personal_records,
  public.exercise_feedback,
  public.scheduled_sessions,
  public.daily_food_logs,
  public.meal_logs,
  public.meal_tracking,
  public.meal_plans,
  public.client_meal_plans,
  public.weight_logs,
  public.body_measurements,
  public.progress_photos,
  public.daily_checkins,
  public.messages,
  public.coach_notes,
  public.coach_appointments,
  public.activity_feed,
  public.payments
FROM anon;

-- All three RPCs require an authenticated caller. Revoke the PostgreSQL
-- default PUBLIC execution path, then preserve the effective server contract.
REVOKE ALL ON FUNCTION public.get_workout_session_summary(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workout_session_summary(uuid, uuid)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_role(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_role(text)
  TO authenticated, service_role;

DO $postflight$
DECLARE
  target_table text;
  browser_role text;
  admin_privilege text;
  dml_privilege text;
  server_only_privilege text;
  payment_policy_count integer;
BEGIN
  SELECT count(*)
  INTO payment_policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'payments'
    AND (policyname, cmd, roles) IN (
      (
        'payments_client_select_own',
        'SELECT',
        ARRAY['authenticated']::name[]
      ),
      (
        'payments_coach_select_active_clients',
        'SELECT',
        ARRAY['authenticated']::name[]
      )
    );

  IF payment_policy_count <> 2 THEN
    RAISE EXCEPTION 'PAYMENTS_SELECT_POLICIES_INCOMPLETE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payments'
      AND (
        policyname IN (
          'payments_coach_all',
          'coach see own payments',
          'Coaches can view their payments'
        )
        OR (
          policyname LIKE '%coach%'
          AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
        )
      )
  ) THEN
    RAISE EXCEPTION 'PAYMENTS_COACH_WRITE_POLICY_REMAINS';
  END IF;

  FOREACH target_table IN ARRAY ARRAY[
    'coach_clients', 'profiles', 'workout_sessions', 'workout_sets',
    'custom_programs', 'training_programs', 'client_programs',
    'completed_sessions', 'personal_records', 'exercise_feedback',
    'scheduled_sessions', 'daily_food_logs', 'meal_logs', 'meal_tracking',
    'meal_plans', 'client_meal_plans', 'weight_logs', 'body_measurements',
    'progress_photos', 'daily_checkins', 'messages', 'coach_notes',
    'coach_appointments', 'activity_feed', 'payments'
  ]
  LOOP
    FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
      FOREACH admin_privilege IN ARRAY ARRAY[
        'TRUNCATE', 'REFERENCES', 'TRIGGER'
      ]
      LOOP
        IF has_table_privilege(
          browser_role,
          format('public.%I', target_table),
          admin_privilege
        ) THEN
          RAISE EXCEPTION 'APPLICATION_ADMIN_GRANT_REMAINS: %.% %',
            browser_role, target_table, admin_privilege;
        END IF;
      END LOOP;
    END LOOP;

    FOREACH dml_privilege IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE']
    LOOP
      IF has_table_privilege(
        'anon',
        format('public.%I', target_table),
        dml_privilege
      ) THEN
        RAISE EXCEPTION 'ANON_APPLICATION_DML_GRANT_REMAINS: % %',
          target_table, dml_privilege;
      END IF;
    END LOOP;
  END LOOP;

  FOREACH dml_privilege IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE']
  LOOP
    IF has_table_privilege(
      'authenticated',
      'public.payments',
      dml_privilege
    ) THEN
      RAISE EXCEPTION 'AUTHENTICATED_PAYMENT_WRITE_GRANT_REMAINS: %',
        dml_privilege;
    END IF;
  END LOOP;

  FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    FOREACH server_only_privilege IN ARRAY ARRAY[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE',
      'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ]
    LOOP
      IF has_table_privilege(
        browser_role,
        'public.stripe_webhook_events',
        server_only_privilege
      ) THEN
        RAISE EXCEPTION 'STRIPE_WEBHOOK_BROWSER_GRANT_REMAINS: % %',
          browser_role, server_only_privilege;
      END IF;
    END LOOP;
  END LOOP;

  IF NOT has_column_privilege(
    'authenticated',
    'public.messages',
    'read',
    'UPDATE'
  ) THEN
    RAISE EXCEPTION 'MESSAGES_READ_COLUMN_UPDATE_GRANT_MISSING';
  END IF;

  IF has_table_privilege('authenticated', 'public.messages', 'UPDATE') THEN
    RAISE EXCEPTION 'MESSAGES_TABLE_UPDATE_GRANT_REINTRODUCED';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.is_active_coach_client_relation(uuid,uuid)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.is_active_messaging_pair(uuid,uuid)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.get_workout_session_summary(uuid,uuid)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.delete_user_account(uuid)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.set_role(text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'ANON_SECURITY_DEFINER_EXECUTE_REMAINS';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.payments', 'SELECT')
    OR NOT has_table_privilege('service_role', 'public.payments', 'INSERT')
    OR NOT has_table_privilege('service_role', 'public.payments', 'UPDATE')
    OR NOT has_table_privilege('service_role', 'public.payments', 'DELETE') THEN
    RAISE EXCEPTION 'PAYMENTS_SERVICE_ROLE_WRITER_GRANT_MISSING';
  END IF;

  IF NOT has_table_privilege(
    'service_role',
    'public.stripe_webhook_events',
    'SELECT'
  ) OR NOT has_table_privilege(
    'service_role',
    'public.stripe_webhook_events',
    'INSERT'
  ) OR NOT has_table_privilege(
    'service_role',
    'public.stripe_webhook_events',
    'UPDATE'
  ) OR NOT has_table_privilege(
    'service_role',
    'public.stripe_webhook_events',
    'DELETE'
  ) THEN
    RAISE EXCEPTION 'STRIPE_WEBHOOK_SERVICE_ROLE_GRANT_MISSING';
  END IF;
END
$postflight$;

COMMIT;
