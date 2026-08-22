BEGIN;

DO $preflight$
DECLARE
  target_table text;
BEGIN
  IF to_regprocedure(
    'public.is_active_coach_client_relation(uuid,uuid)'
  ) IS NULL THEN
    RAISE EXCEPTION 'PROGRESSION_RLS_REQUIRES_ACTIVE_RELATION_HELPER';
  END IF;

  FOREACH target_table IN ARRAY ARRAY[
    'progress_photos',
    'body_measurements',
    'weight_logs',
    'daily_checkins',
    'personal_records'
  ]
  LOOP
    IF to_regclass(format('public.%I', target_table)) IS NULL THEN
      RAISE EXCEPTION 'PROGRESSION_RLS_REQUIRES_TABLE: %', target_table;
    END IF;
  END LOOP;
END
$preflight$;

DROP POLICY IF EXISTS "progress_photos_coach_read"
  ON public.progress_photos;
CREATE POLICY "progress_photos_coach_read"
ON public.progress_photos
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), progress_photos.user_id)
);

DROP POLICY IF EXISTS "body_measurements_coach_read"
  ON public.body_measurements;
CREATE POLICY "body_measurements_coach_read"
ON public.body_measurements
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), body_measurements.user_id)
);

DROP POLICY IF EXISTS "weight_logs_coach_read"
  ON public.weight_logs;
CREATE POLICY "weight_logs_coach_read"
ON public.weight_logs
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), weight_logs.user_id)
);

DROP POLICY IF EXISTS "daily_checkins_coach_read"
  ON public.daily_checkins;
CREATE POLICY "daily_checkins_coach_read"
ON public.daily_checkins
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), daily_checkins.user_id)
);

DROP POLICY IF EXISTS "personal_records_coach_read"
  ON public.personal_records;
CREATE POLICY "personal_records_coach_read"
ON public.personal_records
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), personal_records.user_id)
);

DO $postflight$
DECLARE
  required_policy_count integer;
BEGIN
  SELECT count(*)
  INTO required_policy_count
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND (tablename, policyname) IN (
      ('progress_photos', 'progress_photos_coach_read'),
      ('body_measurements', 'body_measurements_coach_read'),
      ('weight_logs', 'weight_logs_coach_read'),
      ('daily_checkins', 'daily_checkins_coach_read'),
      ('personal_records', 'personal_records_coach_read')
    )
    AND cmd = 'SELECT'
    AND roles = ARRAY['authenticated']::name[]
    AND qual LIKE '%is_active_coach_client_relation%';

  IF required_policy_count <> 5 THEN
    RAISE EXCEPTION 'PROGRESSION_ACTIVE_COACH_POLICIES_INCOMPLETE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'progress_photos',
        'body_measurements',
        'weight_logs',
        'daily_checkins',
        'personal_records'
      )
      AND (
        coalesce(qual, '') LIKE '%coach_clients%'
        OR coalesce(with_check, '') LIKE '%coach_clients%'
        OR coalesce(qual, '') ~ 'auth\.uid\(\)\s*=\s*coach_id'
        OR coalesce(with_check, '') ~ 'auth\.uid\(\)\s*=\s*coach_id'
      )
  ) THEN
    RAISE EXCEPTION 'PROGRESSION_LEGACY_COACH_BYPASS_REMAINS';
  END IF;
END
$postflight$;

COMMIT;
