-- Set video_url and gif_url for "Développé militaire" variants
UPDATE exercises_db
SET video_url = '/videos/exercises/developpe-militaire.mp4?v=3',
    gif_url = '/videos/exercises/developpe-militaire.jpg'
WHERE name ILIKE '%Développé militaire%'
   OR name ILIKE '%overhead press%';
