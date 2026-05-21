-- ============================================================
-- Sprint Launch Prep — Phase 2 RLS audit
-- ============================================================
-- Drop 2 PERMISSIVE policies with USING: true that bypass
-- the coach_clients ownership check on sensitive data.
--
-- Both tables already have a correctly scoped coach-read policy
-- (progress_photos_coach_read, body_measurements_coach_read) that
-- uses coach_clients lookup. The dropped policies were duplicates
-- with a broken predicate, granting read access to ALL authenticated
-- users (not just the assigned coach).
--
-- Impact analysis pre-fix:
--   - Any authenticated user could SELECT * FROM progress_photos
--   - Any authenticated user could SELECT * FROM body_measurements
--   - Data leak: progression photos (visual transformation) and
--     body metrics (weight, body fat %, measurements) — RGPD/nLPD
--     sensitive (health data).
--
-- Detected: 2026-05-21 during Phase 2 RLS audit.
-- Affected since: unknown (policies pre-existing in schema).
-- Real-world exploitation: none confirmed (0 paying customers).
-- ============================================================

-- Bug #1 — progress_photos
DROP POLICY IF EXISTS "coach read photos" ON public.progress_photos;

-- Bug #2 — body_measurements
DROP POLICY IF EXISTS "coach read measurements" ON public.body_measurements;
