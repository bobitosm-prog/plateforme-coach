-- Clean up empty custom_programs (no exercises in any day)
-- These are ghost programs created when user taps "New program" but never adds exercises
DELETE FROM custom_programs
WHERE days IS NULL
   OR days::text = '[]'
   OR days::text = 'null'
   OR NOT EXISTS (
     SELECT 1 FROM jsonb_array_elements(days) AS d
     WHERE jsonb_array_length(COALESCE(d->'exercises', '[]'::jsonb)) > 0
   );
