UPDATE exercises_db SET
  video_url = '/videos/exercises/hip-thrust.mp4?v=4',
  gif_url = '/videos/exercises/hip-thrust.jpg?v=4'
WHERE name ILIKE '%hip thrust%barre%' OR name ILIKE 'hip thrust';
