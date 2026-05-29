-- ============================================================================
-- Migration : Update weekly diagnostic cron from weekly to daily
-- Date      : 2026-05-29
-- Context   : F4d.10b — Architecture B Cron individualise
--             Cron tourne desormais TOUS LES JOURS a 18h UTC
--             Mais ne traite que les users dont next_diagnostic_at <= NOW()
--             Rythme 7 jours STRICT par user (vs dimanche fixe pour tous)
-- ============================================================================
--
-- IMPORTANT : Remplacer YOUR_CRON_SECRET_HERE par la vraie valeur
-- avant d'apply dans Supabase SQL Editor.
-- ============================================================================

DO $func$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    -- Unschedule l'ancien job (idempotency)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-diagnostic-auto') THEN
      PERFORM cron.unschedule('weekly-diagnostic-auto');
    END IF;

    -- Re-schedule en QUOTIDIEN a 18h UTC
    PERFORM cron.schedule(
      'weekly-diagnostic-auto',
      '0 18 * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://app.moovx.ch/api/weekly-diagnostic/cron',
        headers := jsonb_build_object(
          'Authorization', 'Bearer YOUR_CRON_SECRET_HERE',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );
      $cron$
    );

    RAISE NOTICE 'Cron job weekly-diagnostic-auto re-scheduled to DAILY 18h UTC';
  ELSE
    RAISE NOTICE 'pg_cron or pg_net not installed — skipping';
  END IF;
END $func$;
