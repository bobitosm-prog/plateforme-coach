-- Set video_url and gif_url for squat barre variants
UPDATE exercises_db
SET video_url = '/videos/exercises/squat-barre.mp4?v=3',
    gif_url = '/videos/exercises/squat-barre.jpg'
WHERE name ILIKE '%squat%barre%'
   OR name ILIKE '%back squat%'
   OR name ILIKE '%squat classique%';
