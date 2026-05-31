-- ============================================================
-- Add profiles.next_program_regen_at (F6.B.6)
-- ============================================================
-- Phase 6B Training : regen auto programme tous les 14j (anti-stagnation).
-- Track quand le prochain regen automatique du programme est du.
--
-- Pose a NOW+14j a chaque generation de programme (onboarding hook + Apply diagnostic).
-- Le cron F6.B.6-2 traite les users dont next_program_regen_at <= NOW.
--
-- Backfill : users clients onboarded existants -> NOW+14j (ils ont deja un programme,
-- entrent dans le cycle de regen). Nouveaux users : NULL jusqu'a 1ere generation.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS next_program_regen_at timestamptz;

-- Backfill users clients onboarded (ils ont un programme actif, entrent dans le cycle)
UPDATE profiles
SET next_program_regen_at = NOW() + INTERVAL '14 days'
WHERE role = 'client'
  AND onboarding_completed = true
  AND next_program_regen_at IS NULL;

-- Verification
DO $verify$
DECLARE
  v_col_exists INT;
  v_backfilled INT;
BEGIN
  SELECT COUNT(*) INTO v_col_exists
  FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name = 'next_program_regen_at';

  IF v_col_exists != 1 THEN
    RAISE EXCEPTION 'Migration failed: column next_program_regen_at not created';
  END IF;

  SELECT COUNT(*) INTO v_backfilled
  FROM profiles
  WHERE role = 'client' AND onboarding_completed = true AND next_program_regen_at IS NOT NULL;

  RAISE NOTICE 'F6.B.6 migration successful: column added, % onboarded clients backfilled', v_backfilled;
END $verify$;
