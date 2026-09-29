-- Run only after deploying the Apple migrations/routes and setting the matching
-- APPLE_IAP_CRON_SECRET + APPLE_IAP_SYNC_ENABLED=true server environment values.
-- First create a Supabase Vault secret named moovx_apple_iap_cron_secret in the
-- dashboard. Paste its value manually; NEVER commit or print the real secret.
-- Example for SQL Editor only:
-- SELECT vault.create_secret('REPLACE_MANUALLY', 'moovx_apple_iap_cron_secret');
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') OR
     NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_net') THEN
    RAISE EXCEPTION 'Apple scheduling requires pg_cron and pg_net';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='moovx_apple_iap_cron_secret') THEN
    RAISE EXCEPTION 'Configure the dedicated Apple cron secret in Vault first';
  END IF;
  PERFORM cron.schedule('moovx-apple-sync', '* * * * *', $job$
    SELECT net.http_post(
      url:='https://app.moovx.ch/api/apple/sync',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' ||
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='moovx_apple_iap_cron_secret')),
      body:='{}'::jsonb, timeout_milliseconds:=120000
    );
  $job$);
END;
$$;
-- Pause without changing purchase evidence: SELECT cron.unschedule('moovx-apple-sync');
