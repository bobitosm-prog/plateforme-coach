-- Nullable metadata: historical rows and in-progress unsided drafts stay unchanged.
ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS side text;
ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS round_number integer;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.workout_sets'::regclass AND conname = 'workout_sets_leg_side_check') THEN
    ALTER TABLE public.workout_sets ADD CONSTRAINT workout_sets_leg_side_check
      CHECK ((side IS NULL AND round_number IS NULL) OR (side IS NOT NULL AND side IN ('left', 'right') AND round_number IS NOT NULL AND round_number > 0));
  END IF;
END $$;
COMMENT ON COLUMN public.workout_sets.side IS 'Leg executed in this set; NULL preserves historical unsided sets.';
COMMENT ON COLUMN public.workout_sets.round_number IS 'Prescribed round shared by the left and right leg rows.';
