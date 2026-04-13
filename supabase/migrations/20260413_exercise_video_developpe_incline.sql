-- Set video_url for all "Développé incliné" variants (barre + haltères)
UPDATE exercises_db
SET video_url = '/videos/exercises/developpe-incline-halteres.mp4'
WHERE name ILIKE 'Développé incliné%'
  AND video_url IS NULL;
