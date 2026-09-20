BEGIN;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM * FROM public.weekly_generation_jobs; RAISE EXCEPTION 'private jobs exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM public.weekly_generation_runs; RAISE EXCEPTION 'private runs exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.claim_weekly_generation_v1(gen_random_uuid()); RAISE EXCEPTION 'client claim allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.settle_weekly_generation_v1(gen_random_uuid(),gen_random_uuid(),current_date,'failed',NULL); RAISE EXCEPTION 'client settle allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM * FROM public.weekly_generation_runs; RAISE EXCEPTION 'anonymous monitoring exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.claim_weekly_generation_v1(gen_random_uuid()); RAISE EXCEPTION 'anonymous claim allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
