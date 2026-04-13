-- Set video_url and gif_url for "Soulevé de Terre" ONLY (not variants)
UPDATE exercises_db
SET video_url = '/videos/exercises/souleve-de-terre.mp4?v=3',
    gif_url = '/videos/exercises/souleve-de-terre.jpg'
WHERE name = 'Soulevé de Terre';
