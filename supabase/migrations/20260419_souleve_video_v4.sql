-- Update Soulevé de Terre video to new version (cache bust v4)
UPDATE exercises_db SET
  video_url = '/videos/exercises/souleve-de-terre.mp4?v=4',
  gif_url = '/videos/exercises/souleve-de-terre.png?v=4'
WHERE name = 'Soulevé de Terre';
