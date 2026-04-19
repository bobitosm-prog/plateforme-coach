-- Update Tractions pronation video to new version (cache bust v4)
UPDATE exercises_db SET
  video_url = '/videos/exercises/tractions-pronation.mp4?v=4',
  gif_url = '/videos/exercises/tractions-pronation.png?v=4'
WHERE name = 'Tractions pronation';
