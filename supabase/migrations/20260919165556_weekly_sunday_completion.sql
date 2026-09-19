-- An explicit declaration, not a fabricated food log or completed workout.
CREATE TABLE IF NOT EXISTS public.weekly_day_completions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sunday date NOT NULL CHECK (extract(isodow FROM sunday) = 7),
  meals_confirmed boolean NOT NULL CHECK (meals_confirmed),
  training_status text NOT NULL CHECK (training_status IN ('rest', 'completed', 'skipped')),
  snapshot text NOT NULL CHECK (length(snapshot) = 64),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sunday)
);
ALTER TABLE public.weekly_day_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.weekly_day_completions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.weekly_day_completions TO authenticated;
GRANT ALL ON public.weekly_day_completions TO service_role;
DROP POLICY IF EXISTS weekly_completion_own ON public.weekly_day_completions;
CREATE POLICY weekly_completion_own ON public.weekly_day_completions
  FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id
    AND sunday <= (now() AT TIME ZONE 'Europe/Zurich')::date);
