-- Additive: old sets remain untouched. Seconds are never stored as repetitions.
ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS duration_seconds integer;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workout_sets'::regclass AND conname = 'workout_sets_duration_seconds_check') THEN
    ALTER TABLE public.workout_sets ADD CONSTRAINT workout_sets_duration_seconds_check
      CHECK (duration_seconds IS NULL OR (duration_seconds BETWEEN 1 AND 600 AND reps IS NOT DISTINCT FROM 0 AND weight IS NOT DISTINCT FROM 0));
  END IF;
END $$;
