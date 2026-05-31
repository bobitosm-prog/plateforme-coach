-- ============================================================
-- Schedule training-regen cron (F6.B.6-2b)
-- ============================================================
-- Phase 6B Training : regen auto programme tous les 14j (anti-stagnation).
-- Cron tourne TOUS LES JOURS a 17h UTC (1h avant le diagnostic 18h pour etaler la charge).
-- Ne traite que les users dont next_program_regen_at <= NOW() (rythme 14j strict par user).
--
-- IMPORTANT : Remplacer YOUR_CRON_SECRET_HERE par la vraie valeur
-- avant d'apply dans Supabase SQL Editor.
-- ============================================================
DO $func$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    -- Unschedule l'ancien job (idempotency)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'training-regen-auto') THEN
      PERFORM cron.unschedule('training-regen-auto');
    END IF;
    -- Schedule quotidien a 17h UTC
    PERFORM cron.schedule(
      'training-regen-auto',
      '0 17 * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://app.moovx.ch/api/training-regen/cron',
        headers := jsonb_build_object(
          'Authorization', 'Bearer YOUR_CRON_SECRET_HERE',
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );
      $cron$
    );
    RAISE NOTICE 'Cron job training-regen-auto scheduled DAILY 17h UTC';
  ELSE
    RAISE NOTICE 'pg_cron or pg_net not installed — skipping';
  END IF;
END $func$;
