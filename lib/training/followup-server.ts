import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  analyzeTrainingContinuity,
  type FollowupSet,
} from "./followup-analysis";
import { DEFAULT_FOLLOWUP } from "./followup-preferences";
import { isCatalogExerciseCompatible } from "./equipment-contract";
import { composeEquipmentString } from "./build-program-params";

export function followupDatabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function loadFollowupState(userId: string) {
  const db = followupDatabase();
  const [pref, programs, profile, history, proposals, context, monthly] =
    await Promise.all([
      db
        .from("training_followup_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      db
        .from("custom_programs")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(2),
      db.from("profiles").select("*").eq("id", userId).single(),
      db
        .from("workout_sets")
        .select(
          "session_id,exercise_id,exercise_name,weight,reps,created_at,technique,workout_sessions!inner(completed)",
        )
        .eq("user_id", userId)
        .eq("completed", true)
        .eq("workout_sessions.completed", true)
        .is("technique", null)
        .gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1000),
      db
        .from("training_followup_proposals")
        .select(
          "id,kind,status,candidate,explanation,created_at,expires_at,baseline_context",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      db.rpc("weekly_adjustment_context_v1", { p_user_id: userId }),
      db
        .from("training_followup_proposals")
        .select("program_id,created_at")
        .eq("user_id", userId)
        .eq("kind", "monthly")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (
    [pref, programs, profile, history, proposals, context, monthly].some(
      (result) => result.error,
    ) ||
    !profile.data
  )
    throw new Error("FOLLOWUP_UNAVAILABLE");
  if (programs.data?.length !== 1)
    throw new Error("ACTIVE_PROGRAM_UNAVAILABLE");
  const program = programs.data[0];
  const preferences = pref.data ?? DEFAULT_FOLLOWUP;
  const trends = analyzeTrainingContinuity(
    program,
    (history.data ?? []) as FollowupSet[],
  );
  const latestMonthly =
    monthly.data?.program_id === program.id ? monthly.data : null;
  return {
    db,
    preferences,
    program,
    profile: profile.data,
    trends,
    context: context.data,
    proposals: proposals.data ?? [],
    latestMonthly,
    historyTruncated: history.data?.length === 1000,
  };
}
export async function followupAlternatives(
  state: Awaited<ReturnType<typeof loadFollowupState>>,
) {
  const { data, error } = await state.db
    .from("exercises_db")
    .select("id,name,muscle_group,equipment,equipment_legacy")
    .limit(1000);
  if (error) throw new Error("CATALOG_UNAVAILABLE");
  const equipment = composeEquipmentString(
    state.profile.training_location,
    state.profile.home_equipment,
  );
  return state.trends
    .filter((trend) => trend.status === "stable")
    .map((trend) => {
      const ex =
        state.program.days[trend.dayIndex]?.exercises?.[trend.exerciseIndex];
      const source = data?.find((row) => row.id === ex?.exercise_id);
      return {
        ...trend,
        alternatives: !source?.muscle_group
          ? []
          : (data ?? [])
              .filter(
                (row) =>
                  row.id !== source.id &&
                  row.muscle_group === source.muscle_group &&
                  isCatalogExerciseCompatible(row, equipment),
              )
              .slice(0, 3)
              .map(({ id, name }) => ({ id, name })),
      };
    });
}
