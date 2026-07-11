-- ============================================================
-- Sprint Launch Prep — Phase 2 P2 coach_clients fix
-- ============================================================
-- Fix the previous migration (20260521211443) which introduced
-- a broken WITH CHECK clause.
--
-- Previous attempt:
--   WITH CHECK (
--     client_id = auth.uid()
--     AND coach_id IN (
--       SELECT id FROM profiles WHERE role IN ('coach', 'super_admin')
--     )
--   )
--
-- Problem: the sub-query reads profiles, which has its own RLS
-- enforcing 'id = auth.uid() OR get_my_role() = super_admin'.
-- When executed under a regular client identity during INSERT,
-- the sub-query returns 0 rows (the client only sees their own
-- profile), so coach_id IN (...) is always false, the WITH CHECK
-- fails, the INSERT is rejected.
--
-- Real-world impact: client app/hooks/useClientDashboard.ts:244
-- upsert silently failed for new clients (no try/catch). Verified
-- on test account f.marco@me.com — login succeeded but no
-- coach_clients row was created. Coach assignment broken for
-- all new client logins since 20260521211443.
--
-- Detected and fixed: 2026-05-21 (~20 min after introduction).
--
-- Fix approach: use a SECURITY DEFINER helper function that
-- bypasses RLS when checking the coach role. Standard PostgreSQL
-- pattern for cross-table RLS dependencies.
-- ============================================================

-- Step 1: Create the helper function
CREATE OR REPLACE FUNCTION public.is_coach_role(coach_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = coach_uuid
      AND role IN ('coach', 'super_admin')
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_coach_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach_role(uuid) TO public;

-- Step 2: Drop the broken policy
DROP POLICY IF EXISTS "coach_clients_self_insert_safe" ON public.coach_clients;

-- Step 3: Recreate the policy using the helper function
CREATE POLICY "coach_clients_self_insert_safe" ON public.coach_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND public.is_coach_role(coach_id)
  );
