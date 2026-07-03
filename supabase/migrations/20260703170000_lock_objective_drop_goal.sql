-- Verrouiller profiles.objective sur les 3 valeurs canoniques (cut/mass/maintain/null).
-- Supprimer profiles.goal (colonne morte, null partout, zéro consommateur).
-- Idempotent : ré-exécutable sans erreur.
-- Appliquée en prod le 2026-07-03.

DO $lock$
DECLARE
  v_bad text;
BEGIN
  -- 1. Garde : vérifier qu'aucune valeur déviante ne subsiste
  SELECT string_agg(DISTINCT objective, ', ') INTO v_bad
  FROM profiles
  WHERE objective IS NOT NULL
    AND objective NOT IN ('cut', 'mass', 'maintain');

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'profiles.objective contient des valeurs non canoniques : %. Corriger avant de poser le CHECK.', v_bad;
  END IF;
  RAISE NOTICE 'Garde OK : aucune valeur objective déviante.';

  -- 2. CHECK constraint (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_objective_canonical'
      AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_objective_canonical
      CHECK (objective IS NULL OR objective IN ('cut', 'mass', 'maintain'));
    RAISE NOTICE 'CHECK profiles_objective_canonical ajouté.';
  ELSE
    RAISE NOTICE 'CHECK profiles_objective_canonical existe déjà — skip.';
  END IF;

  -- 3. DROP colonne morte
  ALTER TABLE profiles DROP COLUMN IF EXISTS goal;
  RAISE NOTICE 'Colonne profiles.goal supprimée (ou déjà absente).';
END;
$lock$;
