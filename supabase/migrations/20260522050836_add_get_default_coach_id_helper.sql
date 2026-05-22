-- ============================================================
-- Sprint Launch Prep — Phase 2 P2 default coach lookup
-- ============================================================
-- Fix pre-existing bug discovered during P2 audit:
--   app/hooks/useClientDashboard.ts:235-237 attempts to lookup
--   the default coach profile by email:
--
--     supabase.from('profiles').select('id')
--       .eq('email', defaultEmail).maybeSingle()
--
--   This query is RLS-blocked for client users. profiles has
--   RLS policy: id = auth.uid() OR get_my_role() = 'super_admin'.
--   A client cannot read other users' profiles, including the
--   default coach. The query returns null, defaultCoachId stays
--   null, the upsert branch (else if defaultCoachId) is never
--   reached. Result: new clients NEVER get a coach_clients row
--   created on first login.
--
--   Existing client links (marco.ferreira, mia.nunes, bobitosm)
--   were created through other paths (admin assignment, direct
--   SQL, or earlier when RLS on profiles was looser).
--
-- Detected: 2026-05-22 via DevTools Network inspection during
--   P2 hardening test (no POST coach_clients sent because the
--   else-if branch is never entered).
--
-- Fix approach: same SECURITY DEFINER pattern as is_coach_role.
-- Create get_default_coach_id(text) that bypasses RLS to look
-- up a coach profile by email. The function is restricted to
-- return only profiles with role IN (coach, super_admin) — so
-- it cannot be abused to enumerate arbitrary users.
--
-- The client code will be modified in a follow-up commit to
-- call this function via supabase.rpc() instead of doing the
-- RLS-blocked direct select.
-- ============================================================

-- Create the SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.get_default_coach_id(coach_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $func$
  SELECT id FROM profiles
  WHERE email = coach_email
    AND role IN ('coach', 'super_admin')
  LIMIT 1;
$func$;

-- Grant execute to authenticated users and to public
GRANT EXECUTE ON FUNCTION public.get_default_coach_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_default_coach_id(text) TO public;
