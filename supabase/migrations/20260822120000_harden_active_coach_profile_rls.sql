BEGIN;

-- Wave 0D.9D.1 requires the relation lifecycle schema prepared by 0D.8.
DO $preflight$
BEGIN
  IF to_regclass('public.coach_clients') IS NULL THEN
    RAISE EXCEPTION 'ACTIVE_RELATION_RLS_REQUIRES_COACH_CLIENTS';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'coach_clients'
      AND column_name = 'status'
  ) THEN
    RAISE EXCEPTION 'ACTIVE_RELATION_RLS_REQUIRES_COACH_CLIENTS_STATUS';
  END IF;

  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'ACTIVE_RELATION_RLS_REQUIRES_PROFILES';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.is_active_coach_client_relation(
  coach_uuid uuid,
  client_uuid uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_clients AS relation
    WHERE relation.coach_id = coach_uuid
      AND relation.client_id = client_uuid
      AND relation.status = 'active'
  );
$function$;

REVOKE ALL ON FUNCTION public.is_active_coach_client_relation(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_coach_client_relation(uuid, uuid)
  TO authenticated, service_role;

-- Remove the two known historical policies whose relation checks were not
-- bounded by status. The replacement policies are created in this transaction.
DROP POLICY IF EXISTS "coaches can update client profiles" ON public.profiles;
DROP POLICY IF EXISTS "clients can read their coach profiles" ON public.profiles;

DROP POLICY IF EXISTS "coaches can update active client profiles" ON public.profiles;
CREATE POLICY "coaches can update active client profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), profiles.id)
)
WITH CHECK (
  public.is_active_coach_client_relation(auth.uid(), profiles.id)
);

DROP POLICY IF EXISTS "profiles_coach_select_active_client" ON public.profiles;
CREATE POLICY "profiles_coach_select_active_client"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(auth.uid(), profiles.id)
);

DROP POLICY IF EXISTS "profiles_client_select_active_coach" ON public.profiles;
CREATE POLICY "profiles_client_select_active_coach"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_active_coach_client_relation(profiles.id, auth.uid())
);

DO $postflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname IN (
        'coaches can update client profiles',
        'clients can read their coach profiles'
      )
  ) THEN
    RAISE EXCEPTION 'LEGACY_UNFILTERED_PROFILE_POLICY_REMAINS';
  END IF;
END
$postflight$;

COMMIT;
