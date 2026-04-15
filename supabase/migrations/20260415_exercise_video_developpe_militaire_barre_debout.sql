-- Set video_url and gif_url for "Développé militaire barre debout" ONLY
-- Do NOT touch "Développé Militaire Barre" or "Développé assis haltères"
UPDATE exercises_db
SET video_url = '/videos/exercises/developpe-militaire-barre-debout.mp4?v=3',
    gif_url = '/videos/exercises/developpe-militaire-barre-debout.jpg'
WHERE name = 'Développé militaire barre debout';
