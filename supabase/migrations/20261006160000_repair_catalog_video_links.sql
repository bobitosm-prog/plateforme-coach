-- Repair only exact filename matches already present in the public video bucket.
-- Derive the project URL from an existing catalog storage URL; safe to rerun.
WITH storage_origin AS (
  SELECT substring(video_url from '^(https://[^/]+/storage/v1/object/public/exercise-videos/)') AS base
  FROM public.exercises_catalog
  WHERE video_url LIKE 'https://%/storage/v1/object/public/exercise-videos/%'
  LIMIT 1
)
UPDATE public.exercises_catalog e
SET video_url = origin.base || o.name
FROM storage.objects o, storage_origin origin
WHERE origin.base IS NOT NULL
  AND o.bucket_id = 'exercise-videos'
  AND e.video_url LIKE '/videos/exercises/%'
  AND o.name = replace(split_part(regexp_replace(e.video_url, '^/videos/exercises/', ''), '?', 1), '.mp4', '')
    || '/' || split_part(regexp_replace(e.video_url, '^/videos/exercises/', ''), '?', 1);

