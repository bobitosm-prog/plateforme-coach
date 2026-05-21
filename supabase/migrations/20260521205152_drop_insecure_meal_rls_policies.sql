-- ============================================================
-- Sprint Launch Prep — Phase 2 RLS audit (Tier 2)
-- ============================================================
-- Drop 3 PERMISSIVE policies with USING: true on meal-related
-- tables, and create a missing coach-read policy for meal_logs.
--
-- Same pattern as commit a337951 (Tier 1 audit) on progress_photos
-- and body_measurements: a broken duplicate policy with USING: true
-- bypassing the coach_clients ownership check.
--
-- Tables affected:
--
--   meal_logs (food intake log)
--     - DROP "coach read meal logs" (SELECT, USING: true)
--     - CREATE "meal_logs_coach_read" via coach_clients lookup
--       (no existing coach-read policy; coaches legitimately need
--        access to their clients' meal logs)
--
--   meal_plans (nutrition plans)
--     - DROP "coach manages meal plans" (ALL, USING: true)
--     - No CREATE needed: "meal_plans_coach_read" already exists
--       with proper coach_clients lookup
--
--   meal_tracking (meal compliance tracking)
--     - DROP "coach read all tracking" (SELECT, USING: true)
--     - No CREATE needed: "Coaches can view client meal tracking"
--       and "meal_tracking_coach_read" already exist with proper
--       coach_clients lookup
--
-- Impact analysis pre-fix:
--   meal_logs:     ALL authenticated users could SELECT *
--   meal_plans:    ALL authenticated users could SELECT * AND
--                  modify (UPDATE/DELETE/INSERT — USING: true on ALL)
--   meal_tracking: ALL authenticated users could SELECT *
--
--   Data leak: food intake history, nutrition plans, meal compliance
--   — RGPD/nLPD sensitive (health data — diet, eating patterns).
--
-- Detected: 2026-05-21 during Phase 2 Tier 2 audit.
-- Affected since: unknown (policies pre-existing in schema).
-- Real-world exploitation: none confirmed (0 paying customers).
-- ============================================================

-- DROP the 3 insecure policies
DROP POLICY IF EXISTS "coach read meal logs" ON public.meal_logs;
DROP POLICY IF EXISTS "coach manages meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "coach read all tracking" ON public.meal_tracking;

-- CREATE replacement for meal_logs (no existing coach-read policy)
CREATE POLICY "meal_logs_coach_read" ON public.meal_logs
  FOR SELECT
  TO public
  USING (
    auth.uid() IN (
      SELECT coach_clients.coach_id
      FROM coach_clients
      WHERE coach_clients.client_id = meal_logs.user_id
    )
  );
