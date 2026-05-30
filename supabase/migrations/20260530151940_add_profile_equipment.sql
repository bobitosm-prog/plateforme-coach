-- ============================================================
-- Add profile equipment columns (F6.B.1a)
-- ============================================================
-- Phase 6B Training fondation.
-- Ajoute 2 colonnes :
--   - training_location : 'home' | 'gym' | 'both' (radio onboarding)
--   - home_equipment : text[] (multi-select conditionnel si home/both)
--
-- Backfill : tous users existants → 'gym' + [] (assomption majoritaire,
-- catégorie la plus large permettant tous les exos).
--
-- CHECK constraint sur training_location pour empêcher pollution.
-- home_equipment validé côté app (valeurs ∈ dumbbell/kettlebell/band).
--
-- Idempotent : utilise ADD COLUMN IF NOT EXISTS + DO block pour CHECK.
-- ============================================================

-- 1. Add training_location column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS training_location text;

-- 2. Add home_equipment column (array text)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS home_equipment text[];

-- 3. Backfill users existants (idempotent : ne touche que NULL)
UPDATE profiles
SET training_location = 'gym'
WHERE training_location IS NULL;

UPDATE profiles
SET home_equipment = ARRAY[]::text[]
WHERE home_equipment IS NULL;

-- 4. Verification 100% rows ont training_location defini
DO $func$
DECLARE
  v_invalid_count INT;
BEGIN
  SELECT COUNT(*) INTO v_invalid_count
  FROM profiles
  WHERE training_location IS NULL
     OR training_location NOT IN ('home', 'gym', 'both');

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % rows have invalid training_location', v_invalid_count;
  END IF;

  RAISE NOTICE 'Backfill successful: all % rows have training_location set', (SELECT COUNT(*) FROM profiles);
END $func$;

-- 5. CHECK constraint sur training_location (idempotent)
DO $func$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_training_location_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_training_location_check
      CHECK (training_location IN ('home', 'gym', 'both'));
    RAISE NOTICE 'CHECK constraint added on profiles.training_location';
  ELSE
    RAISE NOTICE 'CHECK constraint already exists, skipping';
  END IF;
END $func$;

-- 6. NOT NULL constraint sur training_location (apres backfill, safe)
DO $func$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name = 'training_location'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE profiles
      ALTER COLUMN training_location SET NOT NULL;
    RAISE NOTICE 'NOT NULL constraint added on profiles.training_location';
  ELSE
    RAISE NOTICE 'NOT NULL constraint already in place, skipping';
  END IF;
END $func$;
