-- ============================================================
-- Sprint Launch Prep — Phase 3 Delete Account RPC
-- ============================================================
-- Atomic transactional deletion of all user-related data
-- across the public schema, for RGPD/nLPD compliance
-- ("right to be forgotten" — RGPD art. 17, nLPD art. 32).
--
-- Replaces the previous loop-based deletion in
-- app/api/delete-account/route.ts which had:
--   - No transaction (partial deletes left orphaned data)
--   - Only 16 tables covered (~30 user-related tables exist)
--   - Silent failures (console.error, then continue, then
--     return success: true to the frontend even on errors)
--
-- This RPC is atomic: if ANY step fails, the entire transaction
-- rolls back. The auth.users entry and Storage files are
-- handled separately by the API route (Storage doesn't support
-- PostgreSQL transactions, and auth.users is in a different
-- schema with its own constraints).
--
-- Permission model:
--   SECURITY DEFINER so the function can DELETE across tables
--   regardless of RLS. The API route validates that the caller
--   is requesting their own deletion (target_user_id = auth.uid()
--   when called via supabase.rpc with anon key, or admin-validated
--   when called from service_role).
--
-- For safety, we also enforce inside the function: only allow
-- deletion if target_user_id matches the current auth.uid() OR
-- the caller has super_admin role. Prevents service_role misuse.
--
-- Tables strategy (51 unique user-data touch points):
--   - Personal data (user_id, client_id, sender_id, receiver_id)
--     → DELETE
--   - Coach-owned data (coach_id) → DELETE
--   - Created content shared with community (created_by on
--     community_foods, exercises_db) → UPDATE NULL (anonymize)
--   - Templates (training_programs.is_template, recipes.is_public)
--     → UPDATE NULL if public, DELETE if private
--   - Messages with current user as receiver → UPDATE sender/
--     receiver NULL (preserve conversation history for the other
--     party, anonymize the leaver)
--
-- Detected: 2026-05-22 during Phase 3 review of the existing
--   delete-account/route.ts code.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  caller_role text;
  affected_messages_sender int;
  affected_messages_receiver int;
BEGIN
  -- ====================================================
  -- SAFETY CHECK: caller must be the target OR super_admin
  -- ====================================================
  -- Get caller's role from profiles (uses search_path = public)
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();

  IF auth.uid() IS NULL OR (auth.uid() != target_user_id AND caller_role != 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: can only delete your own account'
      USING ERRCODE = '42501';
  END IF;

  -- ====================================================
  -- LEVEL 4 — Deep leaf data (no FK dependents)
  -- ====================================================
  DELETE FROM workout_sets WHERE user_id = target_user_id;
  DELETE FROM workout_sessions WHERE user_id = target_user_id;
  DELETE FROM cardio_sessions WHERE user_id = target_user_id;
  DELETE FROM completed_sessions WHERE client_id = target_user_id OR coach_id = target_user_id;
  DELETE FROM scheduled_sessions WHERE user_id = target_user_id;
  DELETE FROM workouts WHERE client_id = target_user_id;

  -- ====================================================
  -- LEVEL 4 — Nutrition logs
  -- ====================================================
  DELETE FROM daily_food_logs WHERE user_id = target_user_id;
  DELETE FROM meal_logs WHERE user_id = target_user_id;
  DELETE FROM meal_tracking WHERE user_id = target_user_id;
  DELETE FROM water_intake WHERE user_id = target_user_id;
  DELETE FROM saved_meals WHERE user_id = target_user_id;
  DELETE FROM nutrition WHERE client_id = target_user_id;

  -- ====================================================
  -- LEVEL 4 — Body tracking
  -- ====================================================
  DELETE FROM body_measurements WHERE user_id = target_user_id;
  DELETE FROM body_analyses WHERE user_id = target_user_id;
  DELETE FROM body_assessments WHERE user_id = target_user_id;
  DELETE FROM weight_logs WHERE user_id = target_user_id;
  DELETE FROM progress_photos WHERE user_id = target_user_id;
  -- Note: storage files (progress-photos/, avatars/) are deleted
  -- by the API route AFTER this RPC succeeds.

  -- ====================================================
  -- LEVEL 4 — Habits, gamification, custom content
  -- ====================================================
  DELETE FROM daily_checkins WHERE user_id = target_user_id;
  DELETE FROM daily_habits WHERE user_id = target_user_id;
  DELETE FROM user_achievements WHERE user_id = target_user_id;
  DELETE FROM user_badges WHERE user_id = target_user_id;
  DELETE FROM user_xp WHERE user_id = target_user_id;
  DELETE FROM personal_records WHERE user_id = target_user_id;
  DELETE FROM progressive_overload_suggestions WHERE user_id = target_user_id;

  DELETE FROM custom_exercises WHERE user_id = target_user_id;
  DELETE FROM custom_foods WHERE user_id = target_user_id;
  DELETE FROM custom_programs WHERE user_id = target_user_id;
  DELETE FROM exercise_feedback WHERE client_id = target_user_id OR coach_id = target_user_id;

  -- ====================================================
  -- LEVEL 4 — AI / chat / logs
  -- ====================================================
  DELETE FROM ai_usage_logs WHERE user_id = target_user_id;
  DELETE FROM chat_ai_messages WHERE user_id = target_user_id;
  DELETE FROM app_logs WHERE user_id = target_user_id;
  DELETE FROM bug_reports WHERE user_id = target_user_id;

  -- ====================================================
  -- LEVEL 3 — Plans and programs (coach assigns to client)
  -- ====================================================
  DELETE FROM client_meal_plans WHERE client_id = target_user_id OR coach_id = target_user_id;
  DELETE FROM client_programs WHERE client_id = target_user_id OR coach_id = target_user_id;
  DELETE FROM meal_plans WHERE user_id = target_user_id OR created_by = target_user_id;
  DELETE FROM user_programs WHERE user_id = target_user_id;

  -- ====================================================
  -- LEVEL 3 — Activity feed
  -- ====================================================
  DELETE FROM activity_feed WHERE user_id = target_user_id OR coach_id = target_user_id;

  -- ====================================================
  -- LEVEL 3 — Coach-specific
  -- ====================================================
  DELETE FROM coach_notes WHERE client_id = target_user_id OR coach_id = target_user_id;
  DELETE FROM commissions WHERE coach_id = target_user_id;

  -- ====================================================
  -- LEVEL 2 — Templates and shared content (anonymize, not delete)
  -- ====================================================
  -- Public templates: anonymize creator, preserve content
  UPDATE training_programs SET coach_id = NULL, created_by = NULL
    WHERE created_by = target_user_id AND is_template = true;
  -- Private programs: full delete
  DELETE FROM training_programs
    WHERE created_by = target_user_id AND (is_template IS NULL OR is_template = false);

  -- Community content: always anonymize (other users benefit)
  UPDATE community_foods SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE exercises_db SET created_by = NULL WHERE created_by = target_user_id;

  -- Recipes: anonymize if public, delete if private
  UPDATE recipes SET user_id = NULL WHERE user_id = target_user_id AND is_public = true;
  DELETE FROM recipes WHERE user_id = target_user_id AND (is_public IS NULL OR is_public = false);

  -- ====================================================
  -- LEVEL 2 — Messages: anonymize for the other party
  -- ====================================================
  -- First delete messages sent by user (their content is theirs)
  DELETE FROM messages WHERE sender_id = target_user_id;
  -- Then anonymize messages received (preserve other party's conversation context)
  UPDATE messages SET receiver_id = NULL WHERE receiver_id = target_user_id;

  -- ====================================================
  -- LEVEL 2 — Payments and coach-client links
  -- ====================================================
  DELETE FROM payments WHERE client_id = target_user_id OR coach_id = target_user_id;
  DELETE FROM coach_clients WHERE client_id = target_user_id OR coach_id = target_user_id;

  -- ====================================================
  -- LEVEL 2 — Push subscriptions
  -- ====================================================
  DELETE FROM push_subscriptions WHERE user_id = target_user_id;

  -- ====================================================
  -- LEVEL 1 — Profile (the root of public schema user data)
  -- ====================================================
  DELETE FROM profiles WHERE id = target_user_id;

  -- ====================================================
  -- Return success with summary
  -- ====================================================
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'deleted_at', now()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Any error rolls back the entire transaction automatically
    RAISE EXCEPTION 'Delete failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$func$;

-- Grant execute to authenticated users (RPC callable via supabase.rpc)
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO service_role;
