-- Set video_url and gif_url for "Curl haltères" ONLY
-- Do NOT touch "Curl Haltères Alterné" or "Curl Haltères Simultané"
UPDATE exercises_db
SET video_url = '/videos/exercises/curl-halteres.mp4?v=3',
    gif_url = '/videos/exercises/curl-halteres.jpg'
WHERE name = 'Curl haltères';
