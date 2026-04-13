-- Set video_url and gif_url for "Développé Militaire Barre" ONLY
UPDATE exercises_db
SET video_url = '/videos/exercises/developpe-militaire-barre.mp4?v=3',
    gif_url = '/videos/exercises/developpe-militaire-barre.jpg'
WHERE name = 'Développé Militaire Barre';
