-- Normalise muscle_group : fusionne 'Abdominaux' (1 ligne) vers 'Abdos' (valeur canonique).
-- Idempotent : relancable sans effet si deja applique (WHERE ne matche plus rien).
UPDATE exercises_db
SET muscle_group = 'Abdos'
WHERE muscle_group = 'Abdominaux';
