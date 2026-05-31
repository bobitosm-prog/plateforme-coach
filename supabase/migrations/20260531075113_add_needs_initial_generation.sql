-- ============================================================
-- Add profiles.needs_initial_generation flag (F6.B.5a)
-- ============================================================
-- Phase 6B Training : gap UX auto-gen post-onboarding.
-- Quand un user termine l'onboarding SOLO, ce flag passe à true.
-- La home détecte le flag et déclenche la génération initiale du
-- meal plan + programme training, puis remet le flag à false.
--
-- Default false : les users existants (déjà onboardés) n'ont pas besoin
-- de regénération automatique (ils ont déjà ou peuvent générer manuellement).
--
-- Idempotent : ADD COLUMN IF NOT EXISTS + DEFAULT false.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS needs_initial_generation boolean NOT NULL DEFAULT false;

-- Verification
DO $verify$
DECLARE
  v_col_exists INT;
BEGIN
  SELECT COUNT(*) INTO v_col_exists
  FROM information_schema.columns
  WHERE table_name = 'profiles'
    AND column_name = 'needs_initial_generation';

  IF v_col_exists != 1 THEN
    RAISE EXCEPTION 'Migration failed: column needs_initial_generation not created';
  END IF;

  RAISE NOTICE 'F6.B.5a migration successful: needs_initial_generation column added';
END $verify$;
