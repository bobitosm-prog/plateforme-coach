BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'LEGACY_ENTITLEMENTS_REQUIRES_PROFILES';
  END IF;
END
$preflight$;

CREATE TABLE IF NOT EXISTS public.legacy_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  source text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT legacy_entitlements_user_type_unique UNIQUE (user_id, type),
  CONSTRAINT legacy_entitlements_type_valid
    CHECK (type IN ('legacy_invited_access')),
  CONSTRAINT legacy_entitlements_source_valid
    CHECK (source IN ('migration', 'admin', 'support_reconciliation')),
  CONSTRAINT legacy_entitlements_dates_valid
    CHECK (ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT legacy_entitlements_revocation_date_valid
    CHECK (revoked_at IS NULL OR revoked_at >= starts_at),
  CONSTRAINT legacy_entitlements_revocation_consistent
    CHECK (
      (revoked_at IS NULL AND revocation_reason IS NULL)
      OR (
        revoked_at IS NOT NULL
        AND revocation_reason IS NOT NULL
        AND char_length(btrim(revocation_reason)) BETWEEN 1 AND 500
      )
    ),
  CONSTRAINT legacy_entitlements_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS legacy_entitlements_source_created_idx
  ON public.legacy_entitlements (source, created_at DESC);
CREATE INDEX IF NOT EXISTS legacy_entitlements_ends_at_idx
  ON public.legacy_entitlements (ends_at)
  WHERE ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS legacy_entitlements_revoked_at_idx
  ON public.legacy_entitlements (revoked_at)
  WHERE revoked_at IS NOT NULL;

ALTER TABLE public.legacy_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_entitlements FORCE ROW LEVEL SECURITY;

-- The dark table has no browser policy. Future access must cross a reviewed,
-- server-only repository; service_role deliberately receives no TRUNCATE,
-- REFERENCES, TRIGGER or MAINTAIN privilege.
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.legacy_entitlements
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.legacy_entitlements
  TO service_role;

DO $postflight$
DECLARE
  browser_role text;
  table_privilege text;
  rls_enabled boolean;
  rls_forced boolean;
BEGIN
  SELECT relrowsecurity, relforcerowsecurity
  INTO rls_enabled, rls_forced
  FROM pg_catalog.pg_class
  WHERE oid = 'public.legacy_entitlements'::regclass;

  IF rls_enabled IS DISTINCT FROM true OR rls_forced IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'LEGACY_ENTITLEMENTS_RLS_INCOMPLETE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'legacy_entitlements'
  ) THEN
    RAISE EXCEPTION 'LEGACY_ENTITLEMENTS_BROWSER_POLICY_PRESENT';
  END IF;

  FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    FOREACH table_privilege IN ARRAY ARRAY[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE',
      'REFERENCES', 'TRIGGER', 'MAINTAIN'
    ]
    LOOP
      IF has_table_privilege(
        browser_role,
        'public.legacy_entitlements',
        table_privilege
      ) THEN
        RAISE EXCEPTION 'LEGACY_ENTITLEMENTS_BROWSER_GRANT_PRESENT: % %',
          browser_role, table_privilege;
      END IF;
    END LOOP;
  END LOOP;
END
$postflight$;

COMMIT;
