\set ON_ERROR_STOP on

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;
\ir ../../supabase/migrations/20260725190000_configure_environment_scoped_cron.sql

-- Explicit production remains accepted only for the historical public origin.
SELECT private.configure_moovx_cron(
  'production',
  'https://app.' || 'moovx.ch',
  :'cron_secret'
);

-- Staging replaces every historical name with the exact Preview alias.
SELECT private.configure_moovx_cron(
  'staging',
  :'preview_base_url',
  :'cron_secret'
);

-- A second application updates configuration and secret without duplicates.
SELECT private.configure_moovx_cron(
  'staging',
  :'preview_base_url',
  :'updated_cron_secret'
);

DO $tests$
BEGIN
  BEGIN
    PERFORM private.configure_moovx_cron(
      'unknown',
      'https://phase-6-invalid.vercel.app',
      'not-persisted'
    );
    RAISE EXCEPTION 'unknown environment was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'unknown environment was accepted' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM private.configure_moovx_cron(
      'staging',
      '',
      'not-persisted'
    );
    RAISE EXCEPTION 'missing URL was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'missing URL was accepted' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM private.configure_moovx_cron(
      'staging',
      'https://app.' || 'moovx.ch',
      'not-persisted'
    );
    RAISE EXCEPTION 'production URL was accepted in staging';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'production URL was accepted in staging' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM private.configure_moovx_cron(
      'staging',
      'https://localhost',
      'not-persisted'
    );
    RAISE EXCEPTION 'local URL was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'local URL was accepted' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM private.configure_moovx_cron(
      'staging',
      'http://phase-6-invalid.vercel.app',
      'not-persisted'
    );
    RAISE EXCEPTION 'HTTP URL was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'HTTP URL was accepted' THEN RAISE; END IF;
  END;
END
$tests$;

SELECT
  count(*) AS job_count,
  count(DISTINCT jobname) AS distinct_job_count,
  bool_and(command NOT LIKE '%app.' || 'moovx.' || 'ch%') AS no_production_app_url,
  bool_and(command NOT LIKE '%moovx.' || 'ch%') AS no_public_moovx_domain
FROM cron.job
WHERE jobname IN (
  'weekly-diagnostic-auto',
  'training-regen-auto',
  'streak-reminder-summer',
  'streak-reminder-winter'
);

SELECT
  environment,
  base_url,
  base_url = :'preview_base_url' AS expected_preview_alias
FROM private.moovx_cron_config;

SELECT
  jobname,
  schedule,
  command LIKE '%private.moovx_cron_url%' AS runtime_url_boundary,
  command LIKE '%private.moovx_cron_headers%' AS runtime_secret_boundary
FROM cron.job
WHERE jobname IN (
  'weekly-diagnostic-auto',
  'training-regen-auto',
  'streak-reminder-summer',
  'streak-reminder-winter'
)
ORDER BY jobname;

ROLLBACK;
