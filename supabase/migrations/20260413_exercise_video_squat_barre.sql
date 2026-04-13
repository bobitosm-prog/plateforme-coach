-- Set video_url and gif_url for squat barre variants (NOT sumo)
UPDATE exercises_db
SET video_url = '/videos/exercises/squat-barre.mp4?v=3',
    gif_url = '/videos/exercises/squat-barre.jpg'
WHERE name IN ('Squat Barre', 'Squat classique back squat');

-- Ensure sumo is NOT included
UPDATE exercises_db
SET video_url = NULL, gif_url = NULL
WHERE name ILIKE '%squat sumo%';
