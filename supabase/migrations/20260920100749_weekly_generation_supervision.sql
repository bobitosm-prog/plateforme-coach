BEGIN;
CREATE TABLE IF NOT EXISTS public.weekly_generation_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz, status text NOT NULL DEFAULT 'running' CHECK(status IN ('running','succeeded','partial','failed')),
 claimed integer NOT NULL DEFAULT 0, succeeded integer NOT NULL DEFAULT 0, blocked integer NOT NULL DEFAULT 0, errors integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.weekly_generation_jobs (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, week_start date NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','succeeded','blocked','failed','expired')),
 failures integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 confirmation_at timestamptz NOT NULL, lease_id uuid, lease_until timestamptz, diagnostic_id uuid,
 error_code text, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,week_start)
);
CREATE INDEX IF NOT EXISTS weekly_generation_claim_idx ON public.weekly_generation_jobs(week_start,available_at) WHERE status='pending';
CREATE INDEX IF NOT EXISTS weekly_generation_runs_started_idx ON public.weekly_generation_runs(started_at DESC);
ALTER TABLE public.weekly_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_generation_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.weekly_generation_jobs,public.weekly_generation_runs FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.weekly_generation_jobs,public.weekly_generation_runs TO service_role;
DROP POLICY IF EXISTS weekly_jobs_server ON public.weekly_generation_jobs;
CREATE POLICY weekly_jobs_server ON public.weekly_generation_jobs FOR ALL TO service_role USING(true) WITH CHECK(true);
DROP POLICY IF EXISTS weekly_runs_server ON public.weekly_generation_runs;
CREATE POLICY weekly_runs_server ON public.weekly_generation_runs FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE OR REPLACE FUNCTION public.claim_weekly_generation_v1(p_run_id uuid)
RETURNS SETOF public.weekly_generation_jobs LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE today date := (now() AT TIME ZONE 'Europe/Zurich')::date; monday date; claimed_count integer;
BEGIN
 monday := today-extract(dow FROM today)::integer-6;
 INSERT INTO public.weekly_generation_runs(id) VALUES(p_run_id);
 UPDATE public.weekly_generation_runs SET status='failed',finished_at=now(),errors=greatest(errors,1)
   WHERE status='running' AND started_at < now()-interval '3 minutes';
 UPDATE public.weekly_generation_jobs SET status='expired',updated_at=now() WHERE week_start<monday AND status IN ('pending','running','blocked');
 UPDATE public.weekly_generation_jobs SET failures=failures+1,status=CASE WHEN failures>=2 THEN 'failed' ELSE 'pending' END,
   error_code='lease_expired',available_at=now()+interval '5 minutes',lease_id=NULL,lease_until=NULL,updated_at=now()
   WHERE status='running' AND lease_until<now();
 INSERT INTO public.weekly_generation_jobs(user_id,week_start,confirmation_at)
 SELECT p.id,monday,c.confirmed_at FROM public.profiles p
 JOIN public.weekly_day_completions c ON c.user_id=p.id AND c.sunday=monday+6
 WHERE p.role='client' AND p.onboarding_completed AND c.meals_confirmed
   AND (p.next_diagnostic_at IS NULL OR p.next_diagnostic_at<=now())
   AND NOT EXISTS(SELECT 1 FROM public.weekly_diagnostics d WHERE d.user_id=p.id AND d.week_start=monday)
 ORDER BY p.id
 ON CONFLICT(user_id,week_start) DO UPDATE SET status='pending',confirmation_at=excluded.confirmation_at,available_at=now(),updated_at=now()
 WHERE weekly_generation_jobs.status='blocked' AND weekly_generation_jobs.confirmation_at<excluded.confirmation_at;
 -- No lock is held during the AI call. Unique rows and SKIP LOCKED coordinate workers.
 RETURN QUERY WITH picked AS (
 SELECT j.user_id,j.week_start FROM public.weekly_generation_jobs j
 WHERE j.week_start=monday AND j.status='pending' AND j.available_at<=now()
 ORDER BY j.available_at,j.user_id FOR UPDATE SKIP LOCKED LIMIT 3
 ) UPDATE public.weekly_generation_jobs j SET status='running',lease_id=p_run_id,lease_until=now()+interval '2 minutes',updated_at=now()
 FROM picked WHERE j.user_id=picked.user_id AND j.week_start=picked.week_start RETURNING j.*;
 GET DIAGNOSTICS claimed_count = ROW_COUNT;
 UPDATE public.weekly_generation_runs SET claimed=claimed_count WHERE id=p_run_id;
 DELETE FROM public.weekly_generation_runs WHERE started_at<now()-interval '90 days';
 DELETE FROM public.weekly_generation_jobs WHERE week_start<today-90;
END $$;
CREATE OR REPLACE FUNCTION public.settle_weekly_generation_v1(p_run_id uuid,p_user_id uuid,p_week_start date,p_outcome text,p_diagnostic_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF p_outcome NOT IN ('succeeded','blocked','failed') THEN RAISE EXCEPTION 'INVALID_OUTCOME'; END IF;
 IF p_outcome='succeeded' AND NOT EXISTS(SELECT 1 FROM public.weekly_diagnostics WHERE id=p_diagnostic_id AND user_id=p_user_id AND week_start=p_week_start) THEN RAISE EXCEPTION 'DIAGNOSTIC_NOT_SAVED'; END IF;
 UPDATE public.weekly_generation_jobs SET
 status=CASE WHEN p_outcome='failed' AND failures<2 THEN 'pending' ELSE p_outcome END,
 failures=failures+CASE WHEN p_outcome='failed' THEN 1 ELSE 0 END,
 available_at=now()+CASE WHEN failures=0 THEN interval '5 minutes' ELSE interval '30 minutes' END,
 error_code=CASE WHEN p_outcome='failed' THEN 'generation_failed' WHEN p_outcome='blocked' THEN 'confirmation_required' END,
 diagnostic_id=p_diagnostic_id,lease_id=NULL,lease_until=NULL,updated_at=now()
 WHERE user_id=p_user_id AND week_start=p_week_start AND status='running' AND lease_id=p_run_id AND lease_until>now();
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_weekly_generation_v1(uuid),public.settle_weekly_generation_v1(uuid,uuid,date,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_weekly_generation_v1(uuid),public.settle_weekly_generation_v1(uuid,uuid,date,text,uuid) TO service_role;
COMMIT;
