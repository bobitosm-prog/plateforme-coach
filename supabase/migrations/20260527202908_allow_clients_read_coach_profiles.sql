-- ============================================================================
-- Migration : Allow clients to read their coach's profile via coach_clients
-- Date      : 2026-05-27
-- Context   : F4c.10b — fix 406 error on /onboarding-v2 step 3 Welcome
--             when client invited tries to fetch coach name.
-- Reference : Confirmed via lib/use-client-permissions.ts L.25 architecture
--             (subscription_type = 'invited' + coach_clients jointure)
-- ============================================================================

CREATE POLICY "clients can read their coach profiles"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM coach_clients
    WHERE coach_clients.client_id = auth.uid()
      AND coach_clients.coach_id = profiles.id
  )
);

COMMENT ON POLICY "clients can read their coach profiles" ON profiles
IS 'Allows a client to read the profile of their coach(s). Symmetric to "coaches can read their clients profiles". Required by /onboarding-v2 INVITED flow to display coach name in welcome screen.';
