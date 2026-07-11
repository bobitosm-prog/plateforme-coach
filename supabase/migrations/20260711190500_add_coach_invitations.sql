-- Coach invitations V1: additive schema, RLS and atomic consumption RPC.
-- Contract: docs/COACH_INVITATION_CONTRACT.md
--
-- Deliberately out of scope here: API routes, frontend cutover, legacy removal,
-- SMTP delivery and remote application of this migration.

-- The application already writes coach_clients.status, but the historical
-- migrations do not reconstruct that column from an empty database. Add it
-- defensively so the invitation RPC is reproducible and remains additive.
ALTER TABLE public.coach_clients
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS public.coach_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recipient_email text NOT NULL,
  token_hash bytea NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invitation_type text NOT NULL DEFAULT 'coach_client',
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

  CONSTRAINT coach_invitations_token_hash_length
    CHECK (octet_length(token_hash) = 32),
  CONSTRAINT coach_invitations_status_valid
    CHECK (status IN ('pending', 'consumed', 'revoked')),
  CONSTRAINT coach_invitations_type_valid
    CHECK (invitation_type = 'coach_client'),
  CONSTRAINT coach_invitations_delivery_status_valid
    CHECK (delivery_status IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT coach_invitations_email_normalized
    CHECK (
      recipient_email = lower(btrim(recipient_email))
      AND char_length(recipient_email) BETWEEN 3 AND 254
      AND recipient_email !~ '[[:cntrl:]]'
      AND recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  CONSTRAINT coach_invitations_expiration_after_creation
    CHECK (expires_at > created_at),
  CONSTRAINT coach_invitations_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT coach_invitations_lifecycle_consistent
    CHECK (
      (
        status = 'pending'
        AND consumed_at IS NULL
        AND consumed_by IS NULL
        AND revoked_at IS NULL
        AND revoked_by IS NULL
      )
      OR
      (
        status = 'consumed'
        AND consumed_at IS NOT NULL
        AND consumed_by IS NOT NULL
        AND revoked_at IS NULL
        AND revoked_by IS NULL
      )
      OR
      (
        status = 'revoked'
        AND consumed_at IS NULL
        AND consumed_by IS NULL
        AND revoked_at IS NOT NULL
        AND revoked_by IS NOT NULL
      )
    ),
  CONSTRAINT coach_invitations_token_hash_unique UNIQUE (token_hash)
);

-- UNIQUE(token_hash) already creates the only token-hash index required.
CREATE INDEX IF NOT EXISTS coach_invitations_coach_created_idx
  ON public.coach_invitations (coach_id, created_at DESC);

CREATE INDEX IF NOT EXISTS coach_invitations_coach_status_idx
  ON public.coach_invitations (coach_id, status);

CREATE INDEX IF NOT EXISTS coach_invitations_recipient_status_idx
  ON public.coach_invitations (recipient_email, status);

CREATE INDEX IF NOT EXISTS coach_invitations_pending_expiry_idx
  ON public.coach_invitations (expires_at)
  WHERE status = 'pending';

-- No partial UNIQUE index on (coach_id, recipient_email) is possible while
-- expiration is calculated rather than persisted: PostgreSQL index predicates
-- cannot safely depend on now(), and a plain status='pending' uniqueness rule
-- would block a fresh invitation after an older pending row expires. Creation
-- must serialize the lookup of a non-expired pending duplicate in its future
-- service/RPC; this lookup is supported by the indexes above.

CREATE OR REPLACE FUNCTION public.prevent_duplicate_pending_coach_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO pg_catalog, public
AS $function$
BEGIN
  -- Serialize the logical (coach, recipient, type) key without persisting an
  -- expired status. hashtextextended is only a lock key, never an authority.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      NEW.coach_id::text || ':' || NEW.recipient_email || ':' || NEW.invitation_type,
      0
    )
  );

  IF EXISTS (
    SELECT 1
    FROM public.coach_invitations AS invitations
    WHERE invitations.coach_id = NEW.coach_id
      AND invitations.recipient_email = NEW.recipient_email
      AND invitations.invitation_type = NEW.invitation_type
      AND invitations.status = 'pending'
      AND invitations.expires_at > clock_timestamp()
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
SET search_path TO pg_catalog, public
AS $function$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_coach_invitation_updated_at
  ON public.coach_invitations;

CREATE TRIGGER set_coach_invitation_updated_at
  BEFORE UPDATE ON public.coach_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_coach_invitation_updated_at();

-- Defense in depth for direct authenticated UPDATE. RLS determines ownership;
-- this trigger limits the only direct transition to pending -> revoked and
-- prevents a coach from replacing immutable or consumption fields.
CREATE OR REPLACE FUNCTION public.guard_coach_invitation_direct_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO pg_catalog, public
AS $function$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL
    OR OLD.coach_id IS DISTINCT FROM auth.uid()
    OR OLD.status IS DISTINCT FROM 'pending'
    OR NEW.status IS DISTINCT FROM 'revoked'
    OR NEW.revoked_by IS DISTINCT FROM auth.uid()
    OR NEW.revoked_at IS NULL
  THEN
    RAISE EXCEPTION 'INVITATION_UPDATE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.coach_id IS DISTINCT FROM OLD.coach_id
    OR NEW.recipient_email IS DISTINCT FROM OLD.recipient_email
    OR NEW.token_hash IS DISTINCT FROM OLD.token_hash
    OR NEW.invitation_type IS DISTINCT FROM OLD.invitation_type
    OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.consumed_at IS DISTINCT FROM OLD.consumed_at
    OR NEW.consumed_by IS DISTINCT FROM OLD.consumed_by
    OR NEW.metadata IS DISTINCT FROM OLD.metadata
    OR NEW.delivery_status IS DISTINCT FROM OLD.delivery_status
    OR NEW.delivery_attempted_at IS DISTINCT FROM OLD.delivery_attempted_at
  THEN
    RAISE EXCEPTION 'INVITATION_IMMUTABLE_FIELDS' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_coach_invitation_direct_update
  ON public.coach_invitations;

CREATE TRIGGER guard_coach_invitation_direct_update
  BEFORE UPDATE ON public.coach_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_coach_invitation_direct_update();

ALTER TABLE public.coach_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_invitations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_invitations_coach_select
  ON public.coach_invitations;
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

DROP POLICY IF EXISTS coach_invitations_coach_insert
  ON public.coach_invitations;
CREATE POLICY coach_invitations_coach_insert
  ON public.coach_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND status = 'pending'
    AND consumed_at IS NULL
    AND consumed_by IS NULL
    AND revoked_at IS NULL
    AND revoked_by IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS coach_invitations_coach_revoke
  ON public.coach_invitations;
CREATE POLICY coach_invitations_coach_revoke
  ON public.coach_invitations
  FOR UPDATE
  TO authenticated
  USING (
    coach_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'coach'
    )
  )
  WITH CHECK (
    coach_id = auth.uid()
    AND status = 'revoked'
    AND revoked_by = auth.uid()
    AND revoked_at IS NOT NULL
  );

-- Supabase commonly grants broad public-schema privileges by default. Replace
-- them with column-level grants so token_hash cannot be selected by an API
-- caller even when the row-level coach policy succeeds.
REVOKE ALL ON TABLE public.coach_invitations FROM anon, authenticated;

GRANT SELECT (
  id,
  coach_id,
  recipient_email,
  status,
  invitation_type,
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

GRANT INSERT (
  coach_id,
  recipient_email,
  token_hash,
  status,
  invitation_type,
  expires_at,
  metadata,
  delivery_status,
  delivery_attempted_at
) ON public.coach_invitations TO authenticated;

GRANT UPDATE (
  status,
  revoked_at,
  revoked_by
) ON public.coach_invitations TO authenticated;

-- Atomic invitation consumption. SECURITY DEFINER is required to read the
-- verified auth email, update protected profile columns and create the
-- coach/client relation. Identity is never accepted as an argument.
CREATE OR REPLACE FUNCTION public.consume_coach_invitation(p_token_hash bytea)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_user_email text;
  v_email_confirmed_at timestamptz;
  v_invitation public.coach_invitations%ROWTYPE;
  v_coach_role text;
  v_client_role text;
  v_subscription_type text;
  v_subscription_status text;
  v_subscription_end_date timestamptz;
  v_stripe_subscription_id text;
  v_affected integer;
BEGIN
  IF v_uid IS NULL THEN
    -- EXECUTE is not granted to anon; keep this defense-in-depth response in
    -- the stable, non-enumerating contract vocabulary.
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_INVALID');
  END IF;

  IF p_token_hash IS NULL OR octet_length(p_token_hash) <> 32 THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_INVALID');
  END IF;

  SELECT lower(btrim(users.email)), users.email_confirmed_at
  INTO v_user_email, v_email_confirmed_at
  FROM auth.users AS users
  WHERE users.id = v_uid;

  IF v_user_email IS NULL OR v_email_confirmed_at IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVITATION_EMAIL_UNVERIFIED'
    );
  END IF;

  SELECT invitations.*
  INTO v_invitation
  FROM public.coach_invitations AS invitations
  WHERE invitations.token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_INVALID');
  END IF;

  IF v_invitation.status = 'consumed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVITATION_ALREADY_USED'
    );
  END IF;

  IF v_invitation.status = 'revoked' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_REVOKED');
  END IF;

  IF v_invitation.expires_at <= clock_timestamp() THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_EXPIRED');
  END IF;

  IF v_invitation.invitation_type <> 'coach_client' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_INVALID');
  END IF;

  IF v_user_email IS DISTINCT FROM v_invitation.recipient_email THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVITATION_EMAIL_MISMATCH'
    );
  END IF;

  SELECT profiles.role
  INTO v_coach_role
  FROM public.profiles
  WHERE profiles.id = v_invitation.coach_id
  FOR SHARE;

  IF v_coach_role IS DISTINCT FROM 'coach' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVITATION_COACH_INVALID'
    );
  END IF;

  SELECT
    profiles.role,
    profiles.subscription_type,
    profiles.subscription_status,
    profiles.subscription_end_date,
    profiles.stripe_subscription_id
  INTO
    v_client_role,
    v_subscription_type,
    v_subscription_status,
    v_subscription_end_date,
    v_stripe_subscription_id
  FROM public.profiles
  WHERE profiles.id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVITATION_RECIPIENT_INELIGIBLE'
    );
  END IF;

  IF v_client_role NOT IN ('client') AND v_client_role IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVITATION_RECIPIENT_INELIGIBLE'
    );
  END IF;

  IF v_subscription_type = 'invited' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVITATION_RECIPIENT_INELIGIBLE'
    );
  END IF;

  IF v_subscription_type IN ('lifetime', 'client_lifetime')
    OR v_subscription_status = 'lifetime'
    OR (
      v_subscription_type = 'beta'
      AND v_subscription_end_date IS NOT NULL
      AND v_subscription_end_date > clock_timestamp()
    )
    OR (
      v_stripe_subscription_id IS NOT NULL
      AND v_subscription_status = 'active'
    )
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVITATION_RECIPIENT_INELIGIBLE'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.coach_clients
    WHERE coach_clients.coach_id = v_invitation.coach_id
      AND coach_clients.client_id = v_uid
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVITATION_ALREADY_LINKED'
    );
  END IF;

  UPDATE public.profiles
  SET role = 'client',
      subscription_status = 'active',
      subscription_type = 'invited',
      trial_ends_at = NULL
  WHERE id = v_uid;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> 1 THEN
    RAISE EXCEPTION 'INVITATION_CONSUMPTION_FAILED'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.coach_clients (
    coach_id,
    client_id,
    status,
    invited_by_coach
  ) VALUES (
    v_invitation.coach_id,
    v_uid,
    'active',
    true
  );

  UPDATE public.coach_invitations
  SET status = 'consumed',
      consumed_at = clock_timestamp(),
      consumed_by = v_uid
  WHERE id = v_invitation.id
    AND status = 'pending'
    AND expires_at > clock_timestamp();

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> 1 THEN
    RAISE EXCEPTION 'INVITATION_CONSUMPTION_FAILED'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invitationId', v_invitation.id,
    'coachId', v_invitation.coach_id,
    'subscriptionType', 'invited'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_coach_invitation(bytea) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_coach_invitation(bytea) FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_coach_invitation(bytea)
  TO authenticated;

COMMENT ON TABLE public.coach_invitations IS
  'One-time, email-bound coach invitations. Stores only SHA-256 token hashes.';

COMMENT ON COLUMN public.coach_invitations.token_hash IS
  '32-byte SHA-256 digest. Raw invitation tokens must never be stored.';

COMMENT ON FUNCTION public.consume_coach_invitation(bytea) IS
  'Atomically consumes an email-bound invitation for auth.uid(); never accepts client or coach identity parameters.';
