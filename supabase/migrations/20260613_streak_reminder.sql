-- ═══════════════════════════════════════════════════════════════
-- Streak reminder: anti-spam column + pg_cron jobs
-- IDEMPOTENT — safe to re-run
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_streak_reminder_at timestamptz;

-- pg_cron jobs: two schedules to cover CET (UTC+1) and CEST (UTC+2)
-- 16:00 UTC = 18:00 CEST (summer), 17:00 UTC = 18:00 CET (winter)
-- The route itself has a Zurich-hour guard and skips if not 18h local.
-- Replace <CRON_SECRET> manually in SQL Editor — NEVER commit the secret.

DO $pgcron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Summer schedule (CEST)
    PERFORM cron.schedule(
      'streak-reminder-summer',
      '0 16 * * *',
      $$SELECT net.http_post(
        'https://app.moovx.ch/api/streak-reminder/cron',
        '{}',
        '{"Content-Type": "application/json", "Authorization": "Bearer <CRON_SECRET>"}'
      )$$
    );
    -- Winter schedule (CET)
    PERFORM cron.schedule(
      'streak-reminder-winter',
      '0 17 * * *',
      $$SELECT net.http_post(
        'https://app.moovx.ch/api/streak-reminder/cron',
        '{}',
        '{"Content-Type": "application/json", "Authorization": "Bearer <CRON_SECRET>"}'
      )$$
    );
  END IF;
END
$pgcron$;
