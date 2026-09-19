-- Run against the disposable nutrition-persistence fixture + profile guard + migration.
BEGIN;
INSERT INTO public.profiles(id,role) VALUES
 ('00000000-0000-4000-8000-000000000091','client'),
 ('00000000-0000-4000-8000-000000000092','client');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000091"}',true);
DO $$ DECLARE result jsonb; expiry timestamptz; BEGIN
 result := public.set_initial_trial(30);
 IF result->>'set' <> 'true' THEN RAISE EXCEPTION 'INITIAL_TRIAL_FAILED'; END IF;
 expiry := (result->>'trial_ends_at')::timestamptz;
 IF expiry <> now()+interval '14 days' THEN RAISE EXCEPTION 'CALLER_CONTROLS_DURATION'; END IF;
 IF public.set_initial_trial()->>'reason' <> 'trial_already_set' THEN RAISE EXCEPTION 'RETRY_RENEWS_TRIAL'; END IF;
 IF (SELECT trial_ends_at FROM public.profiles WHERE id=auth.uid()) <> expiry THEN RAISE EXCEPTION 'EXPIRY_CHANGED'; END IF;
 BEGIN
  UPDATE public.profiles SET trial_ends_at=now()+interval '1 year' WHERE id=auth.uid();
  RAISE EXCEPTION 'CLIENT_CAN_WRITE_EXPIRY';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT trial_ends_at FROM public.profiles WHERE id='00000000-0000-4000-8000-000000000092') IS NOT NULL THEN RAISE EXCEPTION 'OTHER_ACCOUNT_CHANGED'; END IF;
END $$;
UPDATE public.profiles SET trial_ends_at=now()-interval '1 day' WHERE id='00000000-0000-4000-8000-000000000091';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.set_initial_trial()->>'reason' <> 'trial_already_set' THEN RAISE EXCEPTION 'EXPIRED_TRIAL_RENEWED'; END IF;
END $$;
RESET ROLE;
UPDATE public.profiles SET subscription_type='client_monthly', subscription_status='active' WHERE id='00000000-0000-4000-8000-000000000092';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000092"}',true);
DO $$ BEGIN
 IF public.set_initial_trial()->>'reason' <> 'already_has_access' THEN RAISE EXCEPTION 'PAID_SUBSCRIPTION_CHANGED'; END IF;
END $$;
RESET ROLE;
UPDATE public.profiles SET role='coach',subscription_type=NULL,subscription_status=NULL WHERE id='00000000-0000-4000-8000-000000000092';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.set_initial_trial()->>'reason' <> 'not_eligible' THEN RAISE EXCEPTION 'COACH_GRANTED_CLIENT_TRIAL'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{}',true);
DO $$ BEGIN
 IF public.set_initial_trial()->>'reason' <> 'not_authenticated' THEN RAISE EXCEPTION 'MISSING_ID_ACCEPTED'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('anon','public.set_initial_trial(integer)','EXECUTE') THEN RAISE EXCEPTION 'ANONYMOUS_RPC_ALLOWED'; END IF;
END $$;
ROLLBACK;
