-- Ajouter exercise_id (FK vers exercises_db.id) sur workout_sets.
-- Colonne NULLABLE : l'historique existant reste sans id jusqu'au backfill (étape C).
-- exercise_name reste (nom d'affichage riche), exercise_id = lien canonique (analytics/progression).
-- Idempotent : ré-exécutable sans erreur.
-- Appliquée en prod le 2026-07-01.

-- 1. Colonne
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS exercise_id uuid;

-- 2. FK (ON DELETE SET NULL : si un exercice est supprimé, le set garde son exercise_name)
DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workout_sets_exercise_id_fkey'
      AND conrelid = 'workout_sets'::regclass
  ) THEN
    ALTER TABLE workout_sets
      ADD CONSTRAINT workout_sets_exercise_id_fkey
      FOREIGN KEY (exercise_id) REFERENCES exercises_db(id)
      ON DELETE SET NULL;
  END IF;
END;
$fk$;

-- 3. Index pour les futures jointures/filtres par exercise_id
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);
