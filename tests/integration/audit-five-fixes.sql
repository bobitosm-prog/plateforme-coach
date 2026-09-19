\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE public.food_items (name text, source text, energy_kcal numeric, proteins numeric, carbohydrates numeric, fat numeric);
CREATE TABLE public.workout_sets (reps integer, weight double precision);
INSERT INTO public.food_items VALUES ('Seitan','fitness',370,75,14,2), ('Seitan. préemballé','ANSES',134,20.6,6.74,2.5);
INSERT INTO public.workout_sets VALUES (12,20);
\ir ../../supabase/migrations/20260919161544_align_fitness_seitan_reference.sql
\ir ../../supabase/migrations/20260919161544_align_fitness_seitan_reference.sql
\ir ../../supabase/migrations/20260919161732_workout_set_duration_seconds.sql
\ir ../../supabase/migrations/20260919161732_workout_set_duration_seconds.sql
INSERT INTO public.workout_sets VALUES (0,0,30);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.food_items WHERE source='fitness' AND energy_kcal=145 AND proteins=25 AND carbohydrates=6 AND fat=2) THEN RAISE EXCEPTION 'Seitan mismatch'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.food_items WHERE source='ANSES' AND energy_kcal=134) THEN RAISE EXCEPTION 'Branded food changed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workout_sets WHERE reps=12 AND duration_seconds IS NULL) THEN RAISE EXCEPTION 'History changed'; END IF;
  BEGIN
    INSERT INTO public.workout_sets VALUES (30,20,30);
    RAISE EXCEPTION 'Mixed units accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.workout_sets VALUES (0,0,0);
    RAISE EXCEPTION 'Zero duration accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
ROLLBACK;
