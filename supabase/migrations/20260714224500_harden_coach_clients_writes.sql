-- Forward-only hardening for coach/client relationship creation.
-- Authenticated users may read their own relationships, but all direct table
-- mutations are server-owned. Verified invitations keep using their existing
-- SECURITY DEFINER RPC.

ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_clients_manage ON public.coach_clients;
DROP POLICY IF EXISTS coach_clients_self_insert_safe ON public.coach_clients;
DROP POLICY IF EXISTS "coach_clients_self_insert_safe" ON public.coach_clients;
DROP POLICY IF EXISTS "Clients can be assigned" ON public.coach_clients;
DROP POLICY IF EXISTS "clients can insert themselves" ON public.coach_clients;

REVOKE INSERT, UPDATE, DELETE ON public.coach_clients FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.coach_clients FROM anon;
GRANT SELECT ON public.coach_clients TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_default_coach_id(text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.get_default_coach_id(text);
REVOKE ALL ON FUNCTION public.is_coach_role(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.is_coach_role(uuid);

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.coach_clients
    WHERE status = 'active'
    GROUP BY client_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'COACH_CLIENTS_MULTIPLE_ACTIVE_RELATIONS';
  END IF;
END
$block$;

CREATE UNIQUE INDEX IF NOT EXISTS coach_clients_one_active_per_client_idx
  ON public.coach_clients (client_id)
  WHERE status = 'active';

CREATE OR REPLACE FUNCTION public.assign_default_coach(
  p_client_id uuid,
  p_coach_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_existing public.coach_clients%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_client_id::text, 0));

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_client_id AND role = 'client')
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_coach_id AND role = 'coach')
  THEN
    RETURN jsonb_build_object('success', false, 'code', 'DEFAULT_COACH_INVALID');
  END IF;

  SELECT * INTO v_existing
  FROM public.coach_clients
  WHERE client_id = p_client_id
  ORDER BY created_at, id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'assigned', false,
      'coachId', v_existing.coach_id,
      'isDefault', v_existing.coach_id = p_coach_id AND v_existing.status = 'active'
    );
  END IF;

  INSERT INTO public.coach_clients (coach_id, client_id, status, invited_by_coach)
  VALUES (p_coach_id, p_client_id, 'active', false);

  RETURN jsonb_build_object(
    'success', true,
    'assigned', true,
    'coachId', p_coach_id,
    'isDefault', true
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.assign_default_coach(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_default_coach(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.assign_default_coach(uuid, uuid) IS
  'Server-only, serialized default-coach assignment. It never changes subscriptions or replaces an existing relationship.';
