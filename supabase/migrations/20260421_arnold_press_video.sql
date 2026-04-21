UPDATE exercises_db SET
  video_url = '/videos/exercises/arnold-press.mp4?v=4',
  gif_url = '/videos/exercises/arnold-press.jpg?v=4'
WHERE name ILIKE '%arnold%';
