\set ON_ERROR_STOP on

DO $$
DECLARE
  dirty_count bigint;
BEGIN
  SELECT count(*) INTO dirty_count FROM auth.users;
  IF dirty_count <> 0 THEN RAISE EXCEPTION 'RESET_DIRTY: auth.users has % rows', dirty_count; END IF;
  SELECT count(*) INTO dirty_count FROM public.profiles;
  IF dirty_count <> 0 THEN RAISE EXCEPTION 'RESET_DIRTY: profiles has % rows', dirty_count; END IF;
  SELECT count(*) INTO dirty_count FROM public.coach_clients;
  IF dirty_count <> 0 THEN RAISE EXCEPTION 'RESET_DIRTY: coach_clients has % rows', dirty_count; END IF;
  SELECT count(*) INTO dirty_count FROM public.coach_invitations;
  IF dirty_count <> 0 THEN RAISE EXCEPTION 'RESET_DIRTY: coach_invitations has % rows', dirty_count; END IF;
  SELECT count(*) INTO dirty_count FROM public.payments;
  IF dirty_count <> 0 THEN RAISE EXCEPTION 'RESET_DIRTY: payments has % rows', dirty_count; END IF;
END
$$;

SELECT 'Canonical reset data assertions passed' AS result;
