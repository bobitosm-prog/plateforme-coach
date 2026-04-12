-- ═══════════════════════════════════════════════════════════
-- Standardize session types across all tables
-- Old PPL types → Standard French type names
-- ═══════════════════════════════════════════════════════════

-- ══ STEP 1: Update scheduled_sessions.session_type ══
-- Remove the CHECK constraint first (if exists)
ALTER TABLE scheduled_sessions DROP CONSTRAINT IF EXISTS scheduled_sessions_session_type_check;

-- Update session_type values
UPDATE scheduled_sessions SET session_type = 'pectoraux' WHERE session_type IN ('push_a', 'push_b');
UPDATE scheduled_sessions SET session_type = 'dos' WHERE session_type IN ('pull_a', 'pull_b');
UPDATE scheduled_sessions SET session_type = 'jambes' WHERE session_type IN ('legs_a', 'legs_b');
UPDATE scheduled_sessions SET session_type = 'cardio' WHERE session_type IN ('hiit', 'liss');
UPDATE scheduled_sessions SET session_type = 'repos' WHERE session_type = 'rest';
-- 'custom' stays as 'custom' for now

-- ══ STEP 2: Update scheduled_sessions.title ══
UPDATE scheduled_sessions SET title = 'Pectoraux' WHERE title ILIKE 'Push A%' OR title ILIKE 'Push B%';
UPDATE scheduled_sessions SET title = 'Dos' WHERE title ILIKE 'Pull A%' OR title ILIKE 'Pull B%';
UPDATE scheduled_sessions SET title = 'Jambes' WHERE title ILIKE 'Legs A%' OR title ILIKE 'Legs B%' OR title ILIKE 'Legs Quads%' OR title ILIKE 'Legs Ischio%';
UPDATE scheduled_sessions SET title = 'Cardio' WHERE title ILIKE 'Cardio HIIT%' OR title ILIKE 'Cardio LISS%';
UPDATE scheduled_sessions SET title = 'Repos' WHERE title = 'Repos' OR session_type = 'repos';

-- ══ STEP 3: Update workout_sessions.name ══
-- Map old PPL names and day names to standard types
UPDATE workout_sessions SET name = 'Pectoraux' WHERE name ILIKE 'Push%' OR name ILIKE '%pectoraux%' OR name ILIKE '%poitrine%';
UPDATE workout_sessions SET name = 'Dos' WHERE name ILIKE 'Pull%' OR name ILIKE '%dos%' AND name NOT ILIKE '%random%';
UPDATE workout_sessions SET name = 'Jambes' WHERE name ILIKE 'Legs%' OR name ILIKE '%jambe%' OR name ILIKE '%quad%' OR name ILIKE '%ischio%';
UPDATE workout_sessions SET name = 'Épaules' WHERE name ILIKE 'Upper Iso%' OR name ILIKE '%épaule%' OR name ILIKE '%epaule%';
UPDATE workout_sessions SET name = 'Haut du Corps' WHERE name ILIKE 'Upper A%' OR name ILIKE 'Upper B%' OR name ILIKE 'Upper %';
UPDATE workout_sessions SET name = 'Cardio' WHERE name ILIKE 'Cardio%' OR name ILIKE 'HIIT%';
UPDATE workout_sessions SET name = 'Full Body' WHERE name ILIKE 'Full Body%';
-- Day names (lundi, mardi, etc.) that slipped through — leave as-is for now
-- They'll be resolved by resolveSessionType() on display

-- ══ STEP 4: Update custom_programs.days JSONB ══
-- Normalize day names in the JSONB days array
DO $$
DECLARE
  prog RECORD;
  days_arr jsonb;
  day_obj jsonb;
  new_days jsonb;
  old_name text;
  new_name text;
  i int;
  changed boolean;
BEGIN
  FOR prog IN SELECT id, days FROM custom_programs WHERE days IS NOT NULL LOOP
    changed := false;
    days_arr := prog.days;
    new_days := '[]'::jsonb;

    FOR i IN 0..jsonb_array_length(days_arr) - 1 LOOP
      day_obj := days_arr->i;
      old_name := COALESCE(day_obj->>'name', '');

      -- Map old names to standard types
      new_name := old_name;
      IF old_name ILIKE 'Push%' THEN new_name := 'Pectoraux'; changed := true;
      ELSIF old_name ILIKE 'Pull%' THEN new_name := 'Dos'; changed := true;
      ELSIF old_name ILIKE 'Legs%' OR old_name ILIKE 'Lower%' THEN new_name := 'Jambes'; changed := true;
      ELSIF old_name ILIKE 'Upper Iso%' THEN new_name := 'Épaules'; changed := true;
      ELSIF old_name ILIKE 'Upper%' THEN new_name := 'Haut du Corps'; changed := true;
      ELSIF old_name ILIKE 'Full Body%' THEN new_name := 'Full Body'; changed := true;
      ELSIF old_name ILIKE 'Glutes%' OR old_name ILIKE 'Fessier%' THEN new_name := 'Jambes'; changed := true;
      ELSIF old_name ILIKE 'Quads%' THEN new_name := 'Jambes'; changed := true;
      ELSIF old_name ILIKE 'Cardio%' THEN new_name := 'Cardio'; changed := true;
      END IF;

      IF changed THEN
        day_obj := jsonb_set(day_obj, '{name}', to_jsonb(new_name));
      END IF;

      new_days := new_days || jsonb_build_array(day_obj);
    END LOOP;

    IF changed THEN
      UPDATE custom_programs SET days = new_days, updated_at = now() WHERE id = prog.id;
    END IF;
  END LOOP;
END $$;

-- ══ STEP 5: Same for client_programs (coach-assigned) ══
DO $$
DECLARE
  prog RECORD;
  program_obj jsonb;
  day_key text;
  day_obj jsonb;
  old_name text;
  new_name text;
  changed boolean;
BEGIN
  FOR prog IN SELECT id, program FROM client_programs WHERE program IS NOT NULL LOOP
    changed := false;
    program_obj := prog.program;

    FOR day_key IN SELECT jsonb_object_keys(program_obj) LOOP
      day_obj := program_obj->day_key;
      old_name := COALESCE(day_obj->>'day_name', COALESCE(day_obj->>'name', ''));

      new_name := old_name;
      IF old_name ILIKE 'Push%' THEN new_name := 'Pectoraux'; changed := true;
      ELSIF old_name ILIKE 'Pull%' THEN new_name := 'Dos'; changed := true;
      ELSIF old_name ILIKE 'Legs%' OR old_name ILIKE 'Lower%' THEN new_name := 'Jambes'; changed := true;
      ELSIF old_name ILIKE 'Upper%' THEN new_name := 'Haut du Corps'; changed := true;
      ELSIF old_name ILIKE 'Full Body%' THEN new_name := 'Full Body'; changed := true;
      END IF;

      IF changed AND day_obj ? 'day_name' THEN
        program_obj := jsonb_set(program_obj, ARRAY[day_key, 'day_name'], to_jsonb(new_name));
      END IF;
      IF changed AND day_obj ? 'name' THEN
        program_obj := jsonb_set(program_obj, ARRAY[day_key, 'name'], to_jsonb(new_name));
      END IF;
    END LOOP;

    IF changed THEN
      UPDATE client_programs SET program = program_obj, updated_at = now() WHERE id = prog.id;
    END IF;
  END LOOP;
END $$;

-- ══ STEP 6: Update schedule-utils PPL_SCHEDULE references ══
-- This is handled in code — buildWeekSessions will use new types
-- No additional SQL needed

-- ══ STEP 7: Add new CHECK constraint (optional, for data integrity) ══
-- Not enforcing yet since 'custom' and free text may still be used
-- ALTER TABLE scheduled_sessions ADD CONSTRAINT scheduled_sessions_session_type_check
--   CHECK (session_type IN ('pectoraux','dos','epaules','jambes','full_body','haut','bas','cardio','repos','custom','libre'));
