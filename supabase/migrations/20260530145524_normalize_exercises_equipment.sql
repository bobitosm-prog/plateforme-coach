-- ============================================================
-- Normalize exercises_db.equipment column (F6.B.0)
-- ============================================================
-- Phase 6B Training fondation.
-- Audit du 30 mai 2026 : 43 valeurs textuelles chaotiques pour 178 exos.
-- Cible : 6 enum strictes (barbell, dumbbell, kettlebell, band, bodyweight, machine_gym).
--
-- Strategie :
--   1. Backup colonne equipment → equipment_legacy (preserves rollback)
--   2. UPDATE batch via CASE WHEN (mapping 43 → 6)
--   3. Verification 100% rows ont equipment dans les 6 valeurs
--   4. CHECK constraint pour empecher pollutions futures
--
-- Idempotent : si re-run apres application, la 1ere partie skip (equipment_legacy existe),
-- et l'UPDATE bulk ne touche que les rows dont equipment n'est pas deja dans les 6 enum.
-- ============================================================

-- 1. Backup (idempotent : ADD COLUMN IF NOT EXISTS)
ALTER TABLE exercises_db
  ADD COLUMN IF NOT EXISTS equipment_legacy text;

-- Remplir equipment_legacy avec la valeur actuelle de equipment (si pas deja fait)
UPDATE exercises_db
SET equipment_legacy = equipment
WHERE equipment_legacy IS NULL
  AND equipment IS NOT NULL;

-- 2. Normalisation via CASE WHEN (43 → 6)
UPDATE exercises_db
SET equipment = CASE equipment
  -- barbell
  WHEN 'Barre' THEN 'barbell'
  WHEN 'barre' THEN 'barbell'
  WHEN 'Barre EZ' THEN 'barbell'
  WHEN 'barre EZ' THEN 'barbell'
  WHEN 'T-bar' THEN 'barbell'
  WHEN 'disque' THEN 'barbell'
  WHEN 'Barre, Banc' THEN 'barbell'
  WHEN 'Barre EZ, Banc' THEN 'barbell'
  WHEN 'Barre ou Haltères' THEN 'barbell'

  -- dumbbell
  WHEN 'Haltères' THEN 'dumbbell'
  WHEN 'haltères' THEN 'dumbbell'
  WHEN 'Haltère' THEN 'dumbbell'
  WHEN 'Haltère, Banc' THEN 'dumbbell'
  WHEN 'Haltères, Banc incliné' THEN 'dumbbell'
  WHEN 'Disque ou Haltère' THEN 'dumbbell'
  WHEN 'Aucun ou Haltère' THEN 'dumbbell'
  WHEN 'Haltère ou Balle' THEN 'dumbbell'

  -- kettlebell
  WHEN 'Kettlebell' THEN 'kettlebell'

  -- band
  WHEN 'Cordes' THEN 'band'
  WHEN 'Roue abdominale' THEN 'band'

  -- bodyweight
  WHEN 'Poids du corps' THEN 'bodyweight'
  WHEN 'poids du corps' THEN 'bodyweight'
  WHEN 'Aucun' THEN 'bodyweight'
  WHEN 'Aucun ou Sol' THEN 'bodyweight'
  WHEN 'Barre ou Sol' THEN 'bodyweight'
  WHEN 'Barres parallèles' THEN 'bodyweight'
  WHEN 'Box' THEN 'bodyweight'
  WHEN 'Barre de traction' THEN 'bodyweight'

  -- machine_gym
  WHEN 'Machine' THEN 'machine_gym'
  WHEN 'machine' THEN 'machine_gym'
  WHEN 'Poulie' THEN 'machine_gym'
  WHEN 'poulie' THEN 'machine_gym'
  WHEN 'Poulie haute' THEN 'machine_gym'
  WHEN 'Poulie basse' THEN 'machine_gym'
  WHEN 'Poulie haute + Corde' THEN 'machine_gym'
  WHEN 'Haltères ou Poulie' THEN 'machine_gym'
  WHEN 'Tapis roulant' THEN 'machine_gym'
  WHEN 'Elliptique' THEN 'machine_gym'
  WHEN 'Vélo' THEN 'machine_gym'
  WHEN 'Machine à ramer' THEN 'machine_gym'
  WHEN 'Debout' THEN 'machine_gym'
  WHEN 'Assis' THEN 'machine_gym'
  WHEN 'banc' THEN 'machine_gym'

  ELSE equipment  -- garde la valeur si deja normalisee ou inconnue
END
WHERE equipment NOT IN ('barbell', 'dumbbell', 'kettlebell', 'band', 'bodyweight', 'machine_gym')
   OR equipment IS NULL;

-- 3. Verification 100% rows ont equipment valide avant CHECK
DO $func$
DECLARE
  v_invalid_count INT;
BEGIN
  SELECT COUNT(*) INTO v_invalid_count
  FROM exercises_db
  WHERE equipment IS NULL
     OR equipment NOT IN ('barbell', 'dumbbell', 'kettlebell', 'band', 'bodyweight', 'machine_gym');

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % rows still have invalid equipment after normalization', v_invalid_count;
  END IF;

  RAISE NOTICE 'Normalization successful: all % rows have valid equipment', (SELECT COUNT(*) FROM exercises_db);
END $func$;

-- 4. CHECK constraint (idempotent : skip si existe deja)
DO $func$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'exercises_db_equipment_check'
  ) THEN
    ALTER TABLE exercises_db
      ADD CONSTRAINT exercises_db_equipment_check
      CHECK (equipment IN ('barbell', 'dumbbell', 'kettlebell', 'band', 'bodyweight', 'machine_gym'));
    RAISE NOTICE 'CHECK constraint added on exercises_db.equipment';
  ELSE
    RAISE NOTICE 'CHECK constraint already exists, skipping';
  END IF;
END $func$;
