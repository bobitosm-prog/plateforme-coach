-- Set video_url and gif_url for "Tractions pronation" ONLY
UPDATE exercises_db
SET video_url = '/videos/exercises/tractions-pronation.mp4?v=3',
    gif_url = '/videos/exercises/tractions-pronation.jpg'
WHERE name = 'Tractions pronation';
