-- Ajoute rir (Reps In Reserve, 0-4) a workout_sets pour l'auto-regulation RIR.
-- Nullable, pas de default : null = non saisi, distinct de 0 = echec.
-- Idempotent : IF NOT EXISTS.
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS rir int;
