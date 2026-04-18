-- Add muscles_worked column to workout_sessions
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS muscles_worked TEXT[];

-- Backfill existing sessions based on session name
UPDATE workout_sessions SET muscles_worked = ARRAY['Jambes', 'Fessiers']
WHERE muscles_worked IS NULL AND (LOWER(name) LIKE '%jambe%' OR LOWER(name) LIKE '%leg%' OR LOWER(name) LIKE '%squat%');

UPDATE workout_sessions SET muscles_worked = ARRAY['Dos', 'Biceps']
WHERE muscles_worked IS NULL AND (LOWER(name) LIKE '%dos%' OR LOWER(name) LIKE '%back%' OR LOWER(name) LIKE '%pull%' OR LOWER(name) LIKE '%tirage%');

UPDATE workout_sessions SET muscles_worked = ARRAY['Pectoraux', 'Triceps', 'Epaules']
WHERE muscles_worked IS NULL AND (LOWER(name) LIKE '%pec%' OR LOWER(name) LIKE '%chest%' OR LOWER(name) LIKE '%push%' OR LOWER(name) LIKE '%bench%');

UPDATE workout_sessions SET muscles_worked = ARRAY['Epaules']
WHERE muscles_worked IS NULL AND (LOWER(name) LIKE '%epaule%' OR LOWER(name) LIKE '%shoulder%');

UPDATE workout_sessions SET muscles_worked = ARRAY['Biceps', 'Triceps']
WHERE muscles_worked IS NULL AND (LOWER(name) LIKE '%bras%' OR LOWER(name) LIKE '%arm%');

UPDATE workout_sessions SET muscles_worked = ARRAY['Abdos']
WHERE muscles_worked IS NULL AND (LOWER(name) LIKE '%abdo%' OR LOWER(name) LIKE '%core%');
