-- Set video_url and gif_url for "Soulevé de Terre Roumain" ONLY
UPDATE exercises_db
SET video_url = '/videos/exercises/souleve-de-terre-roumain.mp4?v=3',
    gif_url = '/videos/exercises/souleve-de-terre-roumain.jpg'
WHERE name = 'Soulevé de Terre Roumain';
