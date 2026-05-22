-- ============================================================
-- Sprint Launch Prep — Phase 2 P2 coach_clients hardening
-- ============================================================
-- Restrict coach_clients self-insert to prevent users from
-- registering themselves as a client of an arbitrary user.
--
-- Issue detected during Phase 2 Tier 1 audit (2026-05-21):
--   Two INSERT policies allowed any authenticated user to insert
--   a coach_clients row with arbitrary coach_id (no validation
--   that the coach_id designates an actual coach):
--
--     "Clients can be assigned"   WITH CHECK: auth.uid() = client_id
--     "clients can insert themselves" WITH CHECK: client_id = auth.uid()
--
-- Attack vector:
--   1. Attacker authenticated as user X
--   2. INSERT (coach_id = VICTIM, client_id = X)
--   3. Row appears in victim's coach dashboard as a new client
--   4. Potential side effects: notifications spam, commission
--      calculation pollution, fake client count
--
-- Severity: medium (no data leak, but manipulation possible).
--
-- Constraint: cannot fully drop self-insert because the
-- legitimate flow in app/hooks/useClientDashboard.ts:244 does
-- exactly this — a new client upsert's themselves as client of
-- the defaultCoach on first dashboard load. Refactoring to
-- service_role API is out of scope for this 20min fix.
--
-- Approach: defense in depth. Replace the broken policies with
-- one that requires coach_id to actually designate a user with
-- role coach or super_admin. Attacker can no longer claim a
-- random user as their coach.
--
-- Residual limitation: attacker can still self-register with
-- ANY real coach (no per-coach consent check). Full fix would
-- require an invitation token table — tracked as future debt.
-- ============================================================

-- Drop the 2 broken self-insert policies
DROP POLICY IF EXISTS "Clients can be assigned" ON public.coach_clients;
DROP POLICY IF EXISTS "clients can insert themselves" ON public.coach_clients;

-- Create the hardened replacement
CREATE POLICY "coach_clients_self_insert_safe" ON public.coach_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND coach_id IN (
      SELECT id FROM profiles
      WHERE role IN ('coach', 'super_admin')
    )
  );
