BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.profiles') IS NULL
    OR to_regclass('public.coach_clients') IS NULL
    OR to_regprocedure(
      'public.transition_coach_client_relation(uuid,uuid,text,text,uuid,text)'
    ) IS NULL
  THEN
    RAISE EXCEPTION 'COACH_INVITATION_V2_REQUIRES_CANONICAL_RELATION_LIFECYCLE';
  END IF;
END
$preflight$;

CREATE TABLE IF NOT EXISTS public.coach_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recipient_email text NOT NULL,
  token_hash bytea NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  consumed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_status text NOT NULL DEFAULT 'pending',
  delivery_attempted_at timestamptz,

  CONSTRAINT coach_invitations_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT coach_invitations_token_hash_length CHECK (octet_length(token_hash) = 32),
  CONSTRAINT coach_invitations_status_valid CHECK (status IN ('pending', 'consumed', 'revoked')),
  CONSTRAINT coach_invitations_delivery_status_valid
    CHECK (delivery_status IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT coach_invitations_email_normalized CHECK (
    recipient_email = lower(btrim(recipient_email))
    AND char_length(recipient_email) BETWEEN 3 AND 254
    AND recipient_email !~ '[[:cntrl:]]'
    AND recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  CONSTRAINT coach_invitations_expiration_after_creation CHECK (expires_at > created_at),
  CONSTRAINT coach_invitations_lifecycle_consistent CHECK (
    (
      status = 'pending'
      AND consumed_at IS NULL
      AND consumed_by IS NULL
      AND revoked_at IS NULL
      AND revoked_by IS NULL
    )
    OR (
      status = 'consumed'
      AND consumed_at IS NOT NULL
      AND consumed_by IS NOT NULL
      AND revoked_at IS NULL
      AND revoked_by IS NULL
    )
    OR (
      status = 'revoked'
      AND consumed_at IS NULL
      AND consumed_by IS NULL
      AND revoked_at IS NOT NULL
      AND revoked_by IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS coach_invitations_coach_created_idx
  ON public.coach_invitations (coach_id, created_at DESC);
CREATE INDEX IF NOT EXISTS coach_invitations_coach_status_idx
  ON public.coach_invitations (coach_id, status);
CREATE INDEX IF NOT EXISTS coach_invitations_recipient_status_idx
  ON public.coach_invitations (recipient_email, status);
CREATE INDEX IF NOT EXISTS coach_invitations_pending_expiry_idx
  ON public.coach_invitations (expires_at)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.prevent_duplicate_pending_coach_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.coach_id::text || ':' || NEW.recipient_email, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.coach_invitations AS invitation
    WHERE invitation.coach_id = NEW.coach_id
      AND invitation.recipient_email = NEW.recipient_email
      AND invitation.status = 'pending'
      AND invitation.expires_at > pg_catalog.clock_timestamp()
  ) THEN
    RAISE EXCEPTION 'INVITATION_ALREADY_PENDING' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_duplicate_pending_coach_invitation
  ON public.coach_invitations;
CREATE TRIGGER prevent_duplicate_pending_coach_invitation
  BEFORE INSERT ON public.coach_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_pending_coach_invitation();

CREATE OR REPLACE FUNCTION public.set_coach_invitation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_coach_invitation_updated_at ON public.coach_invitations;
CREATE TRIGGER set_coach_invitation_updated_at
  BEFORE UPDATE ON public.coach_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_coach_invitation_updated_at();

ALTER TABLE public.coach_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_invitations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_invitations_coach_insert ON public.coach_invitations;
DROP POLICY IF EXISTS coach_invitations_coach_revoke ON public.coach_invitations;
DROP POLICY IF EXISTS coach_invitations_coach_select ON public.coach_invitations;
CREATE POLICY coach_invitations_coach_select
  ON public.coach_invitations
  FOR SELECT
  TO authenticated
  USING (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'coach'
    )
  );

REVOKE ALL ON TABLE public.coach_invitations FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  coach_id,
  recipient_email,
  status,
  expires_at,
  created_at,
  updated_at,
  consumed_at,
  consumed_by,
  revoked_at,
  revoked_by,
  metadata,
  delivery_status,
  delivery_attempted_at
) ON public.coach_invitations TO authenticated;

DROP FUNCTION IF EXISTS public.consume_coach_invitation(bytea);

CREATE OR REPLACE FUNCTION public.consume_coach_invitation_v2(p_token_hash bytea)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  user_id uuid := auth.uid();
  user_email text;
  email_confirmed_at timestamptz;
  invitation public.coach_invitations%ROWTYPE;
  coach_role text;
  client_role text;
  relation_result jsonb;
  affected_count integer;
BEGIN
  IF user_id IS NULL OR p_token_hash IS NULL OR pg_catalog.octet_length(p_token_hash) <> 32 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_INVALID');
  END IF;

  SELECT lower(btrim(users.email)), users.email_confirmed_at
  INTO user_email, email_confirmed_at
  FROM auth.users AS users
  WHERE users.id = user_id;

  IF user_email IS NULL OR email_confirmed_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_EMAIL_UNVERIFIED');
  END IF;

  SELECT current_invitation.*
  INTO invitation
  FROM public.coach_invitations AS current_invitation
  WHERE current_invitation.token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_INVALID');
  END IF;
  IF invitation.status = 'consumed' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_ALREADY_USED');
  END IF;
  IF invitation.status = 'revoked' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_REVOKED');
  END IF;
  IF invitation.expires_at <= pg_catalog.clock_timestamp() THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_EXPIRED');
  END IF;
  IF user_email IS DISTINCT FROM invitation.recipient_email THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_EMAIL_MISMATCH');
  END IF;

  SELECT profiles.role
  INTO coach_role
  FROM public.profiles
  WHERE profiles.id = invitation.coach_id
  FOR SHARE;
  IF coach_role IS DISTINCT FROM 'coach' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_COACH_INVALID');
  END IF;

  SELECT profiles.role
  INTO client_role
  FROM public.profiles
  WHERE profiles.id = user_id
  FOR UPDATE;
  IF NOT FOUND OR (client_role IS NOT NULL AND client_role <> 'client') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_RECIPIENT_INELIGIBLE');
  END IF;

  SELECT public.transition_coach_client_relation(
    user_id,
    invitation.coach_id,
    'create',
    'invitation',
    user_id,
    NULL
  ) INTO relation_result;

  IF relation_result->>'outcome' = 'conflict' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_ACTIVE_COACH_CONFLICT');
  END IF;
  IF relation_result->>'success' IS DISTINCT FROM 'true'
    OR relation_result->>'outcome' NOT IN ('created', 'already_active_same_coach')
  THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_CONSUMPTION_FAILED');
  END IF;

  IF client_role IS NULL THEN
    UPDATE public.profiles SET role = 'client' WHERE id = user_id AND role IS NULL;
  END IF;

  UPDATE public.coach_invitations
  SET
    status = 'consumed',
    consumed_at = pg_catalog.clock_timestamp(),
    consumed_by = user_id
  WHERE id = invitation.id
    AND status = 'pending'
    AND expires_at > pg_catalog.clock_timestamp();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  IF affected_count <> 1 THEN
    RAISE EXCEPTION 'INVITATION_CONSUMPTION_FAILED' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invitationId', invitation.id,
    'relationId', relation_result->>'relationId',
    'relationOutcome', relation_result->>'outcome'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_coach_invitation_v2(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  user_id uuid := auth.uid();
  invitation public.coach_invitations%ROWTYPE;
BEGIN
  IF user_id IS NULL OR p_invitation_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_FOUND');
  END IF;

  SELECT current_invitation.*
  INTO invitation
  FROM public.coach_invitations AS current_invitation
  WHERE current_invitation.id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND OR invitation.coach_id <> user_id THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_FOUND');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = user_id AND profiles.role = 'coach'
  ) THEN
    RETURN jsonb_build_object('success', false, 'code', 'COACH_REQUIRED');
  END IF;
  IF invitation.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_TERMINAL');
  END IF;

  UPDATE public.coach_invitations
  SET
    status = 'revoked',
    revoked_at = pg_catalog.clock_timestamp(),
    revoked_by = user_id
  WHERE id = invitation.id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITATION_REVOCATION_FAILED' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invitationId', invitation.id,
    'status', 'revoked'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_coach_invitation_v2(bytea)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_coach_invitation_v2(bytea) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_coach_invitation_v2(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_coach_invitation_v2(uuid) TO authenticated;

COMMENT ON TABLE public.coach_invitations IS
  'Single-use, email-bound coach invitations. Raw tokens are never persisted.';
COMMENT ON COLUMN public.coach_invitations.token_hash IS
  '32-byte SHA-256 digest of a cryptographically random URL-safe token.';
COMMENT ON FUNCTION public.consume_coach_invitation_v2(bytea) IS
  'Atomically consumes an invitation through the canonical relation lifecycle writer.';

DO $postflight$
BEGIN
  IF has_function_privilege('anon', 'public.consume_coach_invitation_v2(bytea)', 'EXECUTE')
    OR NOT has_function_privilege(
      'authenticated',
      'public.consume_coach_invitation_v2(bytea)',
      'EXECUTE'
    )
    OR has_function_privilege('anon', 'public.revoke_coach_invitation_v2(uuid)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'COACH_INVITATION_V2_GRANTS_INVALID';
  END IF;
END
$postflight$;

COMMIT;
