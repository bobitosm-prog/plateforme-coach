-- Fix: files are for "Développé assis haltères", not "Développé militaire"
-- Revert militaire
UPDATE exercises_db
SET video_url = NULL, gif_url = NULL
WHERE name ILIKE '%Développé militaire%'
   OR name ILIKE '%overhead press%';

-- Set correct exercise
UPDATE exercises_db
SET video_url = '/videos/exercises/developpe-militaire.mp4?v=3',
    gif_url = '/videos/exercises/developpe-militaire.jpg'
WHERE name = 'Développé assis haltères';
