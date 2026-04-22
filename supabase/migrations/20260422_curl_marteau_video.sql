UPDATE exercises_db SET
  video_url = '/videos/exercises/curl-marteau.mp4?v=4',
  gif_url = '/videos/exercises/curl-marteau.jpg?v=4'
WHERE name ILIKE '%curl%marteau%' OR name ILIKE '%hammer%curl%';
