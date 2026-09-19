-- Run only in the disposable local audit database; no production identities.
BEGIN;
INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
INSERT INTO public.weekly_day_completions VALUES
  ('11111111-1111-4111-8111-111111111111', '2026-09-13', true, 'rest', repeat('a',64), now());
DO $$ BEGIN
  IF (SELECT count(*) FROM public.weekly_day_completions) <> 1 THEN RAISE EXCEPTION 'own read failed'; END IF;
  BEGIN
    INSERT INTO public.weekly_day_completions VALUES
      ('22222222-2222-4222-8222-222222222222','2026-09-13',true,'rest',repeat('a',64),now());
    RAISE EXCEPTION 'cross-account insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.weekly_day_completions SET user_id='22222222-2222-4222-8222-222222222222';
    RAISE EXCEPTION 'ownership transfer allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.weekly_day_completions VALUES
      ('11111111-1111-4111-8111-111111111111','2099-01-04',true,'rest',repeat('a',64),now());
    RAISE EXCEPTION 'future closure allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.weekly_day_completions;
    RAISE EXCEPTION 'delete allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE public.weekly_day_completions SET training_status='skipped';
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.weekly_day_completions) <> 0 THEN RAISE EXCEPTION 'cross-account read allowed'; END IF;
  UPDATE public.weekly_day_completions SET training_status='rest';
  IF FOUND THEN RAISE EXCEPTION 'cross-account update allowed'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM * FROM public.weekly_day_completions;
    RAISE EXCEPTION 'anonymous read allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
