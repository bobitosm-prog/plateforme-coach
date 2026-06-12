-- ═══════════════════════════════════════════════════════════════
-- Backfill personal_records from historical workout_sets
-- IDEMPOTENT : ON CONFLICT DO UPDATE SET ... WHERE new > old
-- (ne degrade jamais un record existant, ne touche que les
-- lignes ou le backfill trouve une valeur superieure)
-- A executer MANUELLEMENT en SQL Editor (convention projet)
-- ═══════════════════════════════════════════════════════════════

-- 1. Backfill '1rm' (Epley: weight * (1 + reps / 30.0))
-- Pour chaque user_id x exercise_name, on prend le set qui
-- maximise le 1RM estime, et on insere/update si superieur.
INSERT INTO personal_records (user_id, exercise_name, record_type, value, unit, achieved_at)
SELECT
  ws.user_id,
  ws.exercise_name,
  '1rm',
  ROUND((best.max_1rm)::numeric, 1),
  'kg',
  best.best_date::date
FROM (
  SELECT
    ws2.user_id,
    ws2.exercise_name,
    MAX(ws2.weight * (1 + ws2.reps / 30.0)) AS max_1rm,
    -- achieved_at = date de la seance du meilleur set
    (ARRAY_AGG(s.created_at ORDER BY ws2.weight * (1 + ws2.reps / 30.0) DESC))[1] AS best_date
  FROM workout_sets ws2
  JOIN workout_sessions s ON s.id = ws2.session_id
  WHERE ws2.weight > 0 AND ws2.reps > 0 AND ws2.completed = true
  GROUP BY ws2.user_id, ws2.exercise_name
) best
JOIN workout_sets ws ON ws.user_id = best.user_id
  AND ws.exercise_name = best.exercise_name
WHERE TRUE
GROUP BY ws.user_id, ws.exercise_name, best.max_1rm, best.best_date
ON CONFLICT (user_id, exercise_name, record_type)
DO UPDATE SET
  value = EXCLUDED.value,
  previous_value = personal_records.value,
  achieved_at = EXCLUDED.achieved_at
WHERE EXCLUDED.value > personal_records.value;

-- 2. Backfill 'max_weight'
INSERT INTO personal_records (user_id, exercise_name, record_type, value, unit, achieved_at)
SELECT
  ws.user_id,
  ws.exercise_name,
  'max_weight',
  best.max_w,
  'kg',
  best.best_date::date
FROM (
  SELECT
    ws2.user_id,
    ws2.exercise_name,
    MAX(ws2.weight) AS max_w,
    (ARRAY_AGG(s.created_at ORDER BY ws2.weight DESC))[1] AS best_date
  FROM workout_sets ws2
  JOIN workout_sessions s ON s.id = ws2.session_id
  WHERE ws2.weight > 0 AND ws2.reps > 0 AND ws2.completed = true
  GROUP BY ws2.user_id, ws2.exercise_name
) best
JOIN workout_sets ws ON ws.user_id = best.user_id
  AND ws.exercise_name = best.exercise_name
WHERE TRUE
GROUP BY ws.user_id, ws.exercise_name, best.max_w, best.best_date
ON CONFLICT (user_id, exercise_name, record_type)
DO UPDATE SET
  value = EXCLUDED.value,
  previous_value = personal_records.value,
  achieved_at = EXCLUDED.achieved_at
WHERE EXCLUDED.value > personal_records.value;
