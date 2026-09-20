-- Apply AFTER the supervised worker is deployed. Preserve the existing command
-- and its secret entirely inside the database; never print or copy them.
DO $$
DECLARE target bigint;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
   SELECT jobid INTO target FROM cron.job WHERE jobname='weekly-diagnostic-auto';
   IF target IS NOT NULL THEN PERFORM cron.alter_job(job_id:=target,schedule:='*/5 * * * *'); END IF;
 END IF;
END $$;
