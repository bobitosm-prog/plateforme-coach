\set ON_ERROR_STOP on

BEGIN;

-- This proof mutates only the local database and is fully rolled back.
ALTER TABLE public.exercises_db
  DROP CONSTRAINT IF EXISTS exercises_db_equipment_check;
TRUNCATE TABLE public.exercises_db CASCADE;

\ir ../../supabase/migrations/20260317010000_seed_exercises_catalog.sql
\ir ../../supabase/migrations/20260409_exercise_variants.sql
\ir ../../supabase/migrations/20260412_exercise_descriptions.sql
\ir ../../supabase/migrations/20260413_exercise_video_developpe_couche.sql
\ir ../../supabase/migrations/20260413_exercise_video_developpe_incline.sql
\ir ../../supabase/migrations/20260413_exercise_video_developpe_militaire.sql
\ir ../../supabase/migrations/20260413_exercise_video_developpe_militaire_barre.sql
\ir ../../supabase/migrations/20260413_exercise_video_rowing_barre.sql
\ir ../../supabase/migrations/20260413_exercise_video_souleve_de_terre.sql
\ir ../../supabase/migrations/20260413_exercise_video_souleve_terre_roumain.sql
\ir ../../supabase/migrations/20260413_exercise_video_squat_barre.sql
\ir ../../supabase/migrations/20260413_exercise_video_tractions_pronation.sql
\ir ../../supabase/migrations/20260415_exercise_video_curl_barre_droit.sql
\ir ../../supabase/migrations/20260415_exercise_video_curl_halteres.sql
\ir ../../supabase/migrations/20260415_exercise_video_developpe_militaire_barre_debout.sql
\ir ../../supabase/migrations/20260419_curl_halteres_v4.sql
\ir ../../supabase/migrations/20260419_dips_video_v4.sql
\ir ../../supabase/migrations/20260419_militaire_video_v4.sql
\ir ../../supabase/migrations/20260419_rdl_video_v4.sql
\ir ../../supabase/migrations/20260419_souleve_video_v4.sql
\ir ../../supabase/migrations/20260419_squat_video_v4.sql
\ir ../../supabase/migrations/20260419_tractions_video_v4.sql
\ir ../../supabase/migrations/20260420_elevations_laterales_v4.sql
\ir ../../supabase/migrations/20260420_kettlebell_swing_v4.sql
\ir ../../supabase/migrations/20260421_arnold_press_video.sql
\ir ../../supabase/migrations/20260421_hip_thrust_video.sql
\ir ../../supabase/migrations/20260422_curl_concentre_video.sql
\ir ../../supabase/migrations/20260422_curl_halteres_alterne_video.sql
\ir ../../supabase/migrations/20260422_curl_marteau_video.sql
\ir ../../supabase/migrations/20260422_elevations_frontales_halteres_video.sql
\ir ../../supabase/migrations/20260518180000_add_missing_parent_exercises.sql
\ir ../../supabase/migrations/20260530145524_normalize_exercises_equipment.sql
\ir ../../supabase/migrations/20260531043341_complete_variant_group.sql
\ir ../../supabase/migrations/20260622120000_normalize_abdos_muscle_group.sql

CREATE TABLE public.phase6_exercise_refs (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exercise_id uuid NOT NULL REFERENCES public.exercises_db(id)
);

INSERT INTO public.phase6_exercise_refs (exercise_id)
VALUES
  ('97a7f20b-22d5-4cca-b26f-8b97bdde0292'),
  ('f4301131-4961-4410-b88f-c5d371dd9a87');

DO $proof$
DECLARE
  v_rows integer;
  v_duplicate_groups integer;
BEGIN
  SELECT count(*) INTO v_rows FROM public.exercises_db;
  SELECT count(*) INTO v_duplicate_groups
  FROM (
    SELECT lower(name)
    FROM public.exercises_db
    GROUP BY lower(name)
    HAVING count(*) > 1
  ) duplicates;

  IF v_rows <> 178 OR v_duplicate_groups <> 2 THEN
    RAISE EXCEPTION
      'unexpected pre-dedup catalog: rows=% duplicate_groups=%',
      v_rows,
      v_duplicate_groups;
  END IF;
END
$proof$;

\ir ../../supabase/migrations/20260701200000_dedup_exercises_db.sql

DO $proof$
DECLARE
  v_rows integer;
  v_duplicate_groups integer;
  v_reassigned integer;
BEGIN
  SELECT count(*) INTO v_rows FROM public.exercises_db;
  SELECT count(*) INTO v_duplicate_groups
  FROM (
    SELECT lower(name)
    FROM public.exercises_db
    GROUP BY lower(name)
    HAVING count(*) > 1
  ) duplicates;
  SELECT count(*) INTO v_reassigned
  FROM public.phase6_exercise_refs
  WHERE exercise_id IN (
    '15e5650c-a821-46a9-bf28-f1cfd859da38',
    'abf0a4d5-b9d3-43df-bbcd-d49e65fde464'
  );

  IF v_rows <> 176 OR v_duplicate_groups <> 0 OR v_reassigned <> 2 THEN
    RAISE EXCEPTION
      'unexpected post-dedup catalog: rows=% duplicate_groups=% reassigned=%',
      v_rows,
      v_duplicate_groups,
      v_reassigned;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.phase6_exercise_refs refs
    LEFT JOIN public.exercises_db exercise ON exercise.id = refs.exercise_id
    WHERE exercise.id IS NULL
  ) THEN
    RAISE EXCEPTION 'dedup left dangling exercise references';
  END IF;
END
$proof$;

CREATE UNIQUE INDEX phase6_exercises_name_ci_unique
  ON public.exercises_db (lower(name));

DO $proof$
BEGIN
  RAISE NOTICE
    'exercises dedup proof: before=178 duplicate_groups=2 deleted=2 references_reassigned=2 after=176 dangling_fk=0 hypothetical_ci_unique=true';
END
$proof$;

ROLLBACK;
