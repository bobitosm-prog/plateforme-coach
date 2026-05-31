-- ============================================================
-- Complete variant_group on remaining 23 exos (F6.B.2 v2)
-- ============================================================
-- Phase 6B Training : fondation substitution intelligente.
-- Audit du 31 mai 2026 : 178 exos total, 155 déjà taggués, 23 NULLs.
-- Cette migration tag 23 exos vers groupes EXISTANTS uniquement (0 nouveau groupe).
--
-- v1 → v2 correction : audit complet 46 variant_groups révèle que les nouveaux
-- groupes envisagés ('glute_bridge', 'chest_press') ET les groupes pour
-- 'singletons' (gainage, leg_curl, kickback_fessiers) existent DÉJÀ.
-- Donc on tag vers eux au lieu de créer.
--
-- Tech debt #10 documenté : fragmentation des variant_groups (good_morning + stiff
-- + rdl + deadlift = même pattern hip hinge en 4 groupes). À consolider post F6.B.4.
--
-- Idempotent : UPDATE par ID + clause AND variant_group IS NULL.
-- ============================================================

-- Groupes 'curl' et 'rowing' (4 UPDATE)
UPDATE exercises_db SET variant_group = 'curl'              WHERE id = '97a7f20b-22d5-4cca-b26f-8b97bdde0292' AND variant_group IS NULL;  -- Curl Barre EZ
UPDATE exercises_db SET variant_group = 'rowing'            WHERE id = '145d0f10-2e72-47b5-a9d4-c07c38da4bb2' AND variant_group IS NULL;  -- Rowing Barre
UPDATE exercises_db SET variant_group = 'rowing'            WHERE id = '7dedbdd3-7916-4607-8ae3-d56b238019ed' AND variant_group IS NULL;  -- Rowing Haltère

-- Groupes 'tirage' et 'traction' (2 UPDATE)
UPDATE exercises_db SET variant_group = 'tirage'            WHERE id = '94ce2e38-8b4a-462c-b1b2-c53efde03bad' AND variant_group IS NULL;  -- Tirage Vertical
UPDATE exercises_db SET variant_group = 'traction'          WHERE id = 'eb1fd07d-8770-43df-a4b7-4ef06284bb05' AND variant_group IS NULL;  -- Tractions

-- Épaules (3 UPDATE)
UPDATE exercises_db SET variant_group = 'dev_militaire'     WHERE id = 'e38482e6-f20a-4552-b307-ceb60d974e3a' AND variant_group IS NULL;  -- Développé Militaire
UPDATE exercises_db SET variant_group = 'elev_front'        WHERE id = '13f5441e-e5a8-4bbd-a35b-173dffe6fb19' AND variant_group IS NULL;  -- Élévations Frontales
UPDATE exercises_db SET variant_group = 'face_pull'         WHERE id = 'd248b7aa-6d65-451a-a933-ad8aaabd17a0' AND variant_group IS NULL;  -- Face Pulls

-- Fessiers (3 UPDATE) : 3 groupes existants distincts
UPDATE exercises_db SET variant_group = 'hip_thrust'        WHERE id = 'd1d1856b-e526-4788-8836-eb456949aebd' AND variant_group IS NULL;  -- Hip Thrust
UPDATE exercises_db SET variant_group = 'kickback_fessiers' WHERE id = '905e8feb-0133-471b-b61f-135f138d8b87' AND variant_group IS NULL;  -- Kickbacks Câble (Fessiers)
UPDATE exercises_db SET variant_group = 'glute_bridge'      WHERE id = 'fba563c1-ac54-4730-aff4-84410231555e' AND variant_group IS NULL;  -- Pont Fessier

-- Ischio-jambiers (2 UPDATE)
UPDATE exercises_db SET variant_group = 'good_morning'      WHERE id = 'f4301131-4961-4410-b88f-c5d371dd9a87' AND variant_group IS NULL;  -- Good Morning
UPDATE exercises_db SET variant_group = 'leg_curl'          WHERE id = '90458eb5-6bfc-42d9-a1b1-732012f011c6' AND variant_group IS NULL;  -- Leg Curl Couché

-- Mollets (1 UPDATE)
UPDATE exercises_db SET variant_group = 'mollet'            WHERE id = 'f8f968e3-c49c-43f2-b25b-7ffb60e2f586' AND variant_group IS NULL;  -- Mollets Debout

-- Pectoraux (1 UPDATE)
UPDATE exercises_db SET variant_group = 'dev_couche'        WHERE id = '038f76a3-4e96-4768-86f0-fcaedcb2d44a' AND variant_group IS NULL;  -- Développé Couché

-- Quadriceps (4 UPDATE)
UPDATE exercises_db SET variant_group = 'fente'             WHERE id = '6ccd4254-4a5b-4539-8a18-427da3bfab47' AND variant_group IS NULL;  -- Fente Bulgare
UPDATE exercises_db SET variant_group = 'fente'             WHERE id = '917e4eca-fb3b-4044-a20b-2dd625b31e25' AND variant_group IS NULL;  -- Fentes
UPDATE exercises_db SET variant_group = 'squat'             WHERE id = '44d8c1f3-7553-4107-a1f8-c8cda68657ea' AND variant_group IS NULL;  -- Squat
UPDATE exercises_db SET variant_group = 'squat'             WHERE id = '6ca90178-ea3b-4103-ac11-5acb8cb488c2' AND variant_group IS NULL;  -- Squat Haltères

-- Triceps (3 UPDATE)
UPDATE exercises_db SET variant_group = 'dips'              WHERE id = 'd4ed9190-3ea8-4408-9b53-81c52a2cfaba' AND variant_group IS NULL;  -- Dips
UPDATE exercises_db SET variant_group = 'ext_triceps'       WHERE id = '347dbfb4-2e60-40cd-bd09-70ff6da728ef' AND variant_group IS NULL;  -- Extension Triceps Poulie
UPDATE exercises_db SET variant_group = 'ext_triceps'       WHERE id = '4a90c008-6fa8-4a87-af8c-15818693713a' AND variant_group IS NULL;  -- Triceps Poulie Corde

-- Abdominaux (1 UPDATE)
UPDATE exercises_db SET variant_group = 'gainage'           WHERE id = '6cec37b7-d63e-46f0-9afe-d8819cde94ca' AND variant_group IS NULL;  -- Planche

-- Verification : 100% taggué après migration (0 NULL)
DO $verify$
DECLARE
  v_total INT;
  v_null_after INT;
  v_total_groups INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM exercises_db;
  SELECT COUNT(*) INTO v_null_after FROM exercises_db WHERE variant_group IS NULL;
  SELECT COUNT(DISTINCT variant_group) INTO v_total_groups FROM exercises_db WHERE variant_group IS NOT NULL;

  RAISE NOTICE 'Total exos: %', v_total;
  RAISE NOTICE 'NULL après migration: % (expected: 0)', v_null_after;
  RAISE NOTICE 'Distinct variant_groups: % (expected: 46 - tous existants, 0 nouveau)', v_total_groups;

  IF v_null_after != 0 THEN
    RAISE EXCEPTION 'Migration check FAILED: expected 0 NULL exos after, got %', v_null_after;
  END IF;

  IF v_total != 178 THEN
    RAISE EXCEPTION 'Total exos changed unexpectedly: expected 178, got %', v_total;
  END IF;

  RAISE NOTICE 'F6.B.2 v2 migration successful: 178/178 exos taggués';
END $verify$;
