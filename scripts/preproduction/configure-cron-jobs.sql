\set ON_ERROR_STOP on
\getenv moovx_environment MOOVX_ENVIRONMENT
\getenv moovx_cron_base_url MOOVX_CRON_BASE_URL
\getenv moovx_cron_secret CRON_SECRET

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT private.configure_moovx_cron(
  :'moovx_environment',
  :'moovx_cron_base_url',
  :'moovx_cron_secret'
);

COMMIT;
