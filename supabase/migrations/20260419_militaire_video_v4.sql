-- Update Développé Militaire Barre video to new version (cache bust v4)
UPDATE exercises_db SET
  video_url = '/videos/exercises/developpe-militaire-barre.mp4?v=4',
  gif_url = '/videos/exercises/developpe-militaire-barre.png?v=4'
WHERE name = 'Développé Militaire Barre';
