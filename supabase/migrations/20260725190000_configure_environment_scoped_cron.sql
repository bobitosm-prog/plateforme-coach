-- Environment-scoped cron configuration.
--
-- This migration deliberately DOES NOT create, replace, or remove any cron
-- job. Production keeps its existing jobs unchanged. A staging operator may
-- call private.configure_moovx_cron only after the target environment, Preview
-- alias, extensions, and secret have passed the preproduction guard.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.moovx_cron_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  environment text NOT NULL CHECK (environment IN ('production', 'staging')),
  base_url text NOT NULL,
  cron_secret_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.moovx_cron_config FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.moovx_cron_url(path text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT config.base_url || path
  FROM private.moovx_cron_config AS config
  WHERE config.singleton
$$;

CREATE OR REPLACE FUNCTION private.moovx_cron_headers()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'Authorization',
    'Bearer ' || secret.decrypted_secret,
    'Content-Type',
    'application/json'
  )
  FROM private.moovx_cron_config AS config
  JOIN vault.decrypted_secrets AS secret
    ON secret.id = config.cron_secret_id
  WHERE config.singleton
$$;

CREATE OR REPLACE FUNCTION private.configure_moovx_cron(
  target_environment text,
  target_base_url text,
  cron_secret text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  secret_id uuid;
  job_name text;
BEGIN
  -- Validate every input before mutating Vault, configuration, or cron jobs.
  IF target_environment IS NULL
     OR target_environment NOT IN ('production', 'staging') THEN
    RAISE EXCEPTION 'unknown cron environment';
  END IF;

  IF target_base_url IS NULL OR btrim(target_base_url) = '' THEN
    RAISE EXCEPTION 'cron base URL is required';
  END IF;

  IF target_base_url !~ '^https://[a-z0-9][a-z0-9.-]*[a-z0-9]$' THEN
    RAISE EXCEPTION 'cron base URL must be an HTTPS origin without path';
  END IF;

  IF cron_secret IS NULL OR btrim(cron_secret) = '' THEN
    RAISE EXCEPTION 'cron secret is required';
  END IF;

  IF target_environment = 'production'
     AND target_base_url <> 'https://app.moovx.ch' THEN
    RAISE EXCEPTION 'production cron URL must be explicit';
  END IF;

  IF target_environment = 'staging'
     AND (
       target_base_url !~ '^https://[a-z0-9][a-z0-9-]*\.vercel\.app$'
     ) THEN
    RAISE EXCEPTION 'staging cron URL must be a non-production Vercel alias';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_net'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'supabase_vault'
  ) THEN
    RAISE EXCEPTION 'pg_cron, pg_net, and supabase_vault are required';
  END IF;

  SELECT secrets.id
  INTO secret_id
  FROM vault.secrets
  WHERE secrets.name = 'moovx_cron_secret';

  IF secret_id IS NULL THEN
    SELECT vault.create_secret(
      cron_secret,
      'moovx_cron_secret',
      'Environment-scoped MoovX cron bearer token'
    )
    INTO secret_id;
  ELSE
    PERFORM vault.update_secret(
      secret_id,
      cron_secret,
      'moovx_cron_secret',
      'Environment-scoped MoovX cron bearer token'
    );
  END IF;

  INSERT INTO private.moovx_cron_config (
    singleton,
    environment,
    base_url,
    cron_secret_id,
    updated_at
  )
  VALUES (true, target_environment, target_base_url, secret_id, now())
  ON CONFLICT (singleton) DO UPDATE
  SET environment = EXCLUDED.environment,
      base_url = EXCLUDED.base_url,
      cron_secret_id = EXCLUDED.cron_secret_id,
      updated_at = EXCLUDED.updated_at;

  FOREACH job_name IN ARRAY ARRAY[
    'weekly-diagnostic-auto',
    'training-regen-auto',
    'streak-reminder-summer',
    'streak-reminder-winter'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
      PERFORM cron.unschedule(job_name);
    END IF;
  END LOOP;

  PERFORM cron.schedule(
    'weekly-diagnostic-auto',
    '0 18 * * *',
    $job$
    SELECT net.http_post(
      url := private.moovx_cron_url('/api/weekly-diagnostic/cron'),
      headers := private.moovx_cron_headers(),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
    $job$
  );

  PERFORM cron.schedule(
    'training-regen-auto',
    '0 17 * * *',
    $job$
    SELECT net.http_post(
      url := private.moovx_cron_url('/api/training-regen/cron'),
      headers := private.moovx_cron_headers(),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
    $job$
  );

  PERFORM cron.schedule(
    'streak-reminder-summer',
    '0 16 * * *',
    $job$
    SELECT net.http_post(
      url := private.moovx_cron_url('/api/streak-reminder/cron'),
      headers := private.moovx_cron_headers(),
      body := '{}'::jsonb
    );
    $job$
  );

  PERFORM cron.schedule(
    'streak-reminder-winter',
    '0 17 * * *',
    $job$
    SELECT net.http_post(
      url := private.moovx_cron_url('/api/streak-reminder/cron'),
      headers := private.moovx_cron_headers(),
      body := '{}'::jsonb
    );
    $job$
  );
END
$function$;

REVOKE ALL ON FUNCTION private.moovx_cron_url(text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.moovx_cron_headers()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.configure_moovx_cron(text, text, text)
  FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA private TO postgres;
GRANT EXECUTE ON FUNCTION private.configure_moovx_cron(text, text, text)
  TO postgres;
