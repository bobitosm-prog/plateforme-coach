-- Set video_url and gif_url for "Rowing barre buste penché" ONLY
UPDATE exercises_db
SET video_url = '/videos/exercises/rowing-barre.mp4?v=3',
    gif_url = '/videos/exercises/rowing-barre.jpg'
WHERE name = 'Rowing barre buste penché';
