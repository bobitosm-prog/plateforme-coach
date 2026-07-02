-- Déduplication exercises_db : fusionner les 2 doublons casse-only identifiés.
-- Idempotent : ré-exécutable sans erreur ni double effet.
-- Appliquée en prod le 2026-07-01.

DO $dedup$
DECLARE
  v_keep_id uuid;
  v_drop_id uuid;
  v_fk record;
BEGIN
  -- ═══ DOUBLON 1 : "Curl barre EZ" vs "Curl Barre EZ" ═══
  -- Canonique : "Curl barre EZ" (minuscule 'barre', plus courant)
  SELECT id INTO v_keep_id FROM exercises_db WHERE name = 'Curl barre EZ' LIMIT 1;
  SELECT id INTO v_drop_id FROM exercises_db WHERE name = 'Curl Barre EZ' LIMIT 1;

  IF v_keep_id IS NOT NULL AND v_drop_id IS NOT NULL AND v_keep_id <> v_drop_id THEN
    -- Repointer toute FK entrante vers l'id canonique
    FOR v_fk IN
      SELECT
        tc.table_name AS src_table,
        kcu.column_name AS src_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'exercises_db'
        AND ccu.column_name = 'id'
        AND tc.table_schema = 'public'
    LOOP
      EXECUTE format(
        'UPDATE %I SET %I = $1 WHERE %I = $2',
        v_fk.src_table, v_fk.src_column, v_fk.src_column
      ) USING v_keep_id, v_drop_id;
    END LOOP;

    DELETE FROM exercises_db WHERE id = v_drop_id;
    RAISE NOTICE 'Dedup: deleted "Curl Barre EZ" (id=%), kept "Curl barre EZ" (id=%)', v_drop_id, v_keep_id;
  ELSE
    RAISE NOTICE 'Dedup: "Curl Barre EZ" doublon not found or already merged — skipping.';
  END IF;

  -- ═══ DOUBLON 2 : "Good morning" vs "Good Morning" ═══
  -- Canonique : "Good morning" (minuscule 'morning', convention anglaise phrase case)
  SELECT id INTO v_keep_id FROM exercises_db WHERE name = 'Good morning' LIMIT 1;
  SELECT id INTO v_drop_id FROM exercises_db WHERE name = 'Good Morning' LIMIT 1;

  IF v_keep_id IS NOT NULL AND v_drop_id IS NOT NULL AND v_keep_id <> v_drop_id THEN
    FOR v_fk IN
      SELECT
        tc.table_name AS src_table,
        kcu.column_name AS src_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'exercises_db'
        AND ccu.column_name = 'id'
        AND tc.table_schema = 'public'
    LOOP
      EXECUTE format(
        'UPDATE %I SET %I = $1 WHERE %I = $2',
        v_fk.src_table, v_fk.src_column, v_fk.src_column
      ) USING v_keep_id, v_drop_id;
    END LOOP;

    DELETE FROM exercises_db WHERE id = v_drop_id;
    RAISE NOTICE 'Dedup: deleted "Good Morning" (id=%), kept "Good morning" (id=%)', v_drop_id, v_keep_id;
  ELSE
    RAISE NOTICE 'Dedup: "Good Morning" doublon not found or already merged — skipping.';
  END IF;
END;
$dedup$;
