-- Update Curl Barre Droit with video and keyframe
UPDATE exercises_db SET
  video_url = '/videos/exercises/curl-barre-droit.mp4?v=3',
  gif_url = '/videos/exercises/curl-barre-droit.png?v=3'
WHERE name = 'Curl Barre Droit';
