-- Preserve the existing RPC signature, but never accept a caller-selected duration.
-- The row lock serializes retries so concurrent requests cannot renew an expiry.
CREATE OR REPLACE FUNCTION public.set_initial_trial(p_days integer DEFAULT 14)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_end timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('set', false, 'reason', 'not_authenticated');
  END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('set', false, 'reason', 'profile_missing');
  END IF;
  IF v_profile.role IS DISTINCT FROM 'client' THEN
    RETURN jsonb_build_object('set', false, 'reason', 'not_eligible');
  END IF;
  IF v_profile.subscription_type IN ('beta','lifetime','client_lifetime','invited','client_monthly','client_yearly')
     OR v_profile.subscription_status IN ('active','lifetime','beta') THEN
    RETURN jsonb_build_object('set', false, 'reason', 'already_has_access');
  END IF;
  IF v_profile.trial_ends_at IS NOT NULL THEN
    RETURN jsonb_build_object('set', false, 'reason', 'trial_already_set');
  END IF;
  v_end := now() + interval '14 days';
  UPDATE public.profiles SET trial_ends_at = v_end WHERE id = v_uid;
  RETURN jsonb_build_object('set', true, 'trial_ends_at', v_end);
END;
$$;
REVOKE ALL ON FUNCTION public.set_initial_trial(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_initial_trial(integer) TO authenticated;
