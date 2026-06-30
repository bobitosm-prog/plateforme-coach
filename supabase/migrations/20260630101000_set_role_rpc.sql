-- RPC set_role : pose le role initial (client/coach) côté serveur (bypass trigger guard).
-- Gardes : own row (auth.uid), client/coach only (jamais admin), pose initiale (role null),
-- invited ne peut pas devenir coach. Appliquée en prod le 2026-06-30.
CREATE OR REPLACE FUNCTION public.set_role(p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_current text;
  v_sub_type text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('set', false, 'reason', 'not_authenticated');
  END IF;
  IF p_role NOT IN ('client', 'coach') THEN
    RETURN jsonb_build_object('set', false, 'reason', 'invalid_role');
  END IF;
  SELECT role, subscription_type INTO v_current, v_sub_type
  FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_current IS NOT NULL THEN
    RETURN jsonb_build_object('set', false, 'reason', 'role_already_set', 'current', v_current);
  END IF;
  IF p_role = 'coach' AND v_sub_type = 'invited' THEN
    RETURN jsonb_build_object('set', false, 'reason', 'invited_cannot_be_coach');
  END IF;
  UPDATE profiles SET role = p_role WHERE id = v_uid;
  RETURN jsonb_build_object('set', true, 'role', p_role);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_role(text) TO authenticated;
