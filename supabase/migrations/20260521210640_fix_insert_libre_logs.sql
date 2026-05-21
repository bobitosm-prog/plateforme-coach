-- ============================================================
-- Sprint Launch Prep — Phase 2 P1 INSERT libres
-- ============================================================
-- Cleanup of orphaned table + fix of INSERT policies with
-- WITH CHECK: true allowing user_id spoofing.
--
-- Issue 1 — ai_usage_log (singular) orphaned
--   Created 2026-04-16 with proper RLS policies. At some point
--   policies were replaced manually (not via committed migration)
--   with broken ai_usage_log_insert_all (WITH CHECK: true).
--   Sprint 3 (2026-05-17) introduced ai_usage_logs (plural) as
--   replacement. The singular table is now unused (grep confirmed:
--   no references in lib/, app/, anywhere except the original
--   create migration). Table has 0 rows.
--
--   Action: DROP the orphaned table entirely.
--
-- Issue 2 — app_logs INSERT spoofing
--   Two redundant INSERT policies with WITH CHECK: true allow
--   ANY authenticated user to insert app_logs rows with arbitrary
--   user_id (including impersonating another user).
--
--   Active code references in lib/admin/logger.ts, app/coach/*,
--   app/hooks/* — table is heavily used. Cannot drop.
--
--   user_id column is nullable with no default. Many existing
--   inserts omit user_id (system/anonymous logs). Policy must
--   allow NULL user_id while preventing spoofing.
--
--   Action: DROP both broken INSERT policies, CREATE single safe
--   policy with WITH CHECK (user_id IS NULL OR user_id = auth.uid()).
--
-- Impact pre-fix:
--   ai_usage_log: any auth user could insert pollution (table
--     unused so impact = 0, but vector for future bugs).
--   app_logs: attacker could insert logs with user_id of a victim,
--     polluting their personal log feed visible in admin console.
--
-- Detected: 2026-05-21 during Phase 2 Tier 2+3 audit (P1 debt).
-- Real-world exploitation: none confirmed (0 paying customers).
-- ============================================================

-- Issue 1 — Drop orphaned ai_usage_log (singular)
DROP TABLE IF EXISTS public.ai_usage_log;

-- Issue 2 — Replace broken app_logs INSERT policies
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.app_logs;
DROP POLICY IF EXISTS "app_logs_insert_all" ON public.app_logs;

CREATE POLICY "app_logs_insert_safe" ON public.app_logs
  FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
