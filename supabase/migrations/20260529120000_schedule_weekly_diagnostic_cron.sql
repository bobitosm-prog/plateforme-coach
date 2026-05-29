-- ============================================================================
-- Migration : Schedule weekly diagnostic cron job
-- Date      : 2026-05-29
-- Context   : F4d.7 — Auto-generate weekly diagnostics every Sunday 20h Swiss
-- Schedule  : 0 18 * * 0 = dimanche 18h UTC = 20h CEST / 19h CET
-- ============================================================================
--
-- IMPORTANT : Avant d'apply, REMPLACER YOUR_CRON_SECRET_HERE
-- par la vraie valeur de CRON_SECRET (de .env.local).
-- NE PAS COMMIT le SQL avec le secret en dur.
--
-- Pour apply manuellement dans Supabase SQL Editor :
--   1. Copier ce fichier
--   2. Remplacer YOUR_CRON_SECRET_HERE par le vrai secret
--   3. Exécuter
-- ============================================================================

DO $func$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    -- Supprimer le job s'il existe deja (idempotency)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-diagnostic-auto') THEN
      PERFORM cron.unschedule('weekly-diagnostic-auto');
    END IF;

    -- Schedule le nouveau job
    PERFORM cron.schedule(
      'weekly-diagnostic-auto',
      '0 18 * * 0',
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

    RAISE NOTICE 'Cron job weekly-diagnostic-auto scheduled: Sundays 18h UTC';
  ELSE
    RAISE NOTICE 'pg_cron or pg_net not installed — skipping cron job creation';
  END IF;
END $func$;
