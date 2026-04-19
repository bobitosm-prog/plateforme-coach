-- Update Soulevé de Terre Roumain video to new version (cache bust v4)
UPDATE exercises_db SET
  video_url = '/videos/exercises/souleve-de-terre-roumain.mp4?v=4',
  gif_url = '/videos/exercises/souleve-de-terre-roumain.png?v=4'
WHERE name = 'Soulevé de Terre Roumain';
