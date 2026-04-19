-- Update squat barre video to new cinematic version (cache bust v4)
UPDATE exercises_db SET
  video_url = '/videos/exercises/squat-barre.mp4?v=4',
  gif_url = '/videos/exercises/squat-barre.png?v=4'
WHERE LOWER(name) LIKE '%squat barre%' OR LOWER(name) LIKE '%back squat%';
