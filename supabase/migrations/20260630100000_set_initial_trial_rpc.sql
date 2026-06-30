-- RPC set_initial_trial : pose trial_ends_at côté serveur à l'onboarding solo
-- (l'update client direct est bloqué par guard_profile_sensitive_columns).
-- Appliquée en prod via SQL Editor le 2026-06-29/30, versionnée a posteriori.
CREATE OR REPLACE FUNCTION public.set_initial_trial(p_days integer DEFAULT 14)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_end_date timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('set', false, 'reason', 'not_authenticated');
  END IF;
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_uid
      AND subscription_type IN ('beta', 'lifetime', 'invited')
  ) THEN
    RETURN jsonb_build_object('set', false, 'reason', 'already_has_access');
  END IF;
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_uid AND trial_ends_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('set', false, 'reason', 'trial_already_set');
  END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 30 THEN
    p_days := 14;
  END IF;
  v_end_date := now() + (p_days || ' days')::interval;
  UPDATE profiles
  SET trial_ends_at = v_end_date
  WHERE id = v_uid;
  RETURN jsonb_build_object('set', true, 'trial_ends_at', v_end_date);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_initial_trial(integer) TO authenticated;
