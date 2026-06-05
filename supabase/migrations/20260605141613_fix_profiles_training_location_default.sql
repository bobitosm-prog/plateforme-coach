-- Fix: training_location était NOT NULL sans DEFAULT, ce qui faisait échouer
-- handle_new_user() au signup (INSERT profiles sans training_location ->
-- violation NOT NULL -> "Database error saving new user").
-- Ajout d'un DEFAULT 'gym' (valeur du CHECK home/gym/both, cohérente avec
-- le backfill des users existants). Idempotent.
-- Appliqué manuellement en prod le 2026-06-05, versionné ici.

DO $fix$
BEGIN
  ALTER TABLE public.profiles ALTER COLUMN training_location SET DEFAULT 'gym';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'training_location default already set or column missing: %', SQLERRM;
END $fix$;
