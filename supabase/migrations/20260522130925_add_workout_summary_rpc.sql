-- ============================================================
-- RPC get_workout_session_summary
-- ============================================================
-- Returns the data needed by the WorkoutSession TERMINE recap
-- screen: 4 most recent completed sessions with their volume
-- (computed via JOIN on workout_sets), plus aggregated volume
-- for the current week and the previous week.
--
-- Volume is computed as SUM(weight * reps) where set.completed = true.
-- Sessions are filtered by user_id and completed = true.
-- exclude_session_id allows skipping the session that just finished
-- (to avoid counting it twice in 'previous sessions').
--
-- Security : SECURITY DEFINER so the function can aggregate across
-- workout_sets even when RLS on that table would restrict reads.
-- The function still enforces 'caller can only query their own
-- sessions' via target_user_id check.
--
-- Detected need : 2026-05-22, building Apple Fitness style recap
-- with data viz (mini-graph + comparison).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_workout_session_summary(
  target_user_id uuid,
  exclude_session_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  result jsonb;
  previous_sessions jsonb;
  current_week_volume numeric;
  last_week_volume numeric;
BEGIN
  -- Safety check : caller must be the target user OR a super_admin
  IF auth.uid() IS NULL OR (auth.uid() != target_user_id AND
     (SELECT role FROM profiles WHERE id = auth.uid()) != 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: can only query your own sessions'
      USING ERRCODE = '42501';
  END IF;

  -- 4 most recent completed sessions (excluding the current one)
  SELECT COALESCE(jsonb_agg(session_data ORDER BY (session_data->>'date') DESC), '[]'::jsonb)
  INTO previous_sessions
  FROM (
    SELECT jsonb_build_object(
      'id', ws.id,
      'name', ws.name,
      'date', ws.date,
      'volume', COALESCE(SUM(wset.weight * wset.reps), 0)
    ) AS session_data
    FROM workout_sessions ws
    LEFT JOIN workout_sets wset
      ON wset.session_id = ws.id
      AND wset.completed = true
    WHERE ws.user_id = target_user_id
      AND ws.completed = true
      AND (exclude_session_id IS NULL OR ws.id != exclude_session_id)
    GROUP BY ws.id, ws.name, ws.date
    ORDER BY ws.date DESC
    LIMIT 4
  ) sub;

  -- Current week volume (last 7 days, excluding the current session)
  SELECT COALESCE(SUM(wset.weight * wset.reps), 0)
  INTO current_week_volume
  FROM workout_sessions ws
  JOIN workout_sets wset
    ON wset.session_id = ws.id
    AND wset.completed = true
  WHERE ws.user_id = target_user_id
    AND ws.completed = true
    AND (exclude_session_id IS NULL OR ws.id != exclude_session_id)
    AND ws.date >= (CURRENT_DATE - INTERVAL '7 days');

  -- Last week volume (7-14 days ago)
  SELECT COALESCE(SUM(wset.weight * wset.reps), 0)
  INTO last_week_volume
  FROM workout_sessions ws
  JOIN workout_sets wset
    ON wset.session_id = ws.id
    AND wset.completed = true
  WHERE ws.user_id = target_user_id
    AND ws.completed = true
    AND ws.date >= (CURRENT_DATE - INTERVAL '14 days')
    AND ws.date < (CURRENT_DATE - INTERVAL '7 days');

  -- Build result
  result := jsonb_build_object(
    'previousSessions', previous_sessions,
    'currentWeekVolume', current_week_volume,
    'lastWeekVolume', last_week_volume
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Summary query failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$func$;

-- Grant execute to authenticated users (callable via supabase.rpc)
GRANT EXECUTE ON FUNCTION public.get_workout_session_summary(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workout_session_summary(uuid, uuid) TO service_role;
