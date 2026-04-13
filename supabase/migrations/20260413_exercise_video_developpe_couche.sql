-- Set video_url for "Développé couché haltères"
UPDATE exercises_db
SET video_url = '/videos/exercises/developpe-couche-halteres.mp4'
WHERE name ILIKE 'Développé couché%haltères'
  AND video_url IS NULL;
