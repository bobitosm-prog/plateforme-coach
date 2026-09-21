import { normalizeExerciseName } from "../exercise-matching";

export type FollowupSet = {
  session_id: string;
  exercise_id?: string | null;
  exercise_name: string;
  weight: number;
  reps: number;
  created_at: string;
  technique?: string | null;
};
export type ExerciseTrend = {
  key: string;
  name: string;
  dayIndex: number;
  exerciseIndex: number;
  status: "insufficient" | "stable" | "improving" | "declining" | "returning";
  sessions: number;
  lastDate: string | null;
  volumeBefore: number | null;
  volumeAfter: number | null;
};
type Program = {
  days: unknown;
  start_date?: string | null;
  created_at?: string;
};
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

export function monthlyReviewDue(
  program: Program,
  now = new Date(),
  lastProposal?: string | null,
) {
  const anchor = lastProposal || program.start_date || program.created_at;
  if (!anchor) return false;
  const date = new Date(anchor.length === 10 ? `${anchor}T12:00:00Z` : anchor);
  if (!Number.isFinite(date.getTime())) return false;
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const maxDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, maxDay));
  return now >= date;
}

/** Descriptive trends only; no diagnosis or automatic load/volume change. */
export function analyzeTrainingContinuity(
  program: Program,
  rows: FollowupSet[],
  now = new Date(),
): ExerciseTrend[] {
  const result: ExerciseTrend[] = [];
  for (const [dayIndex, rawDay] of (Array.isArray(program.days)
    ? program.days
    : []
  ).entries()) {
    const day = object(rawDay);
    if (day.is_rest || day.repos) continue;
    for (const [exerciseIndex, rawExercise] of (Array.isArray(day.exercises)
      ? day.exercises
      : []
    ).entries()) {
      const ex = object(rawExercise);
      const name = String(ex.name ?? ex.custom_name ?? ex.exercise_name ?? "");
      const key = String(ex.exercise_id || normalizeExerciseName(name));
      const history = rows
        .filter(
          (row) =>
            !row.technique &&
            (ex.exercise_id
              ? row.exercise_id === ex.exercise_id
              : normalizeExerciseName(row.exercise_name) ===
                normalizeExerciseName(name)),
        )
        .filter(
          (row) =>
            Number.isFinite(Date.parse(row.created_at)) &&
            Date.parse(row.created_at) <= now.getTime(),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const groups = new Map<string, FollowupSet[]>();
      for (const row of history) {
        const sets = groups.get(row.session_id) ?? [];
        sets.push(row);
        groups.set(row.session_id, sets);
      }
      const sessions = [...groups.values()].slice(0, 4);
      const lastDate = history[0]?.created_at ?? null;
      let status: ExerciseTrend["status"] = "insufficient";
      let before: number | null = null;
      let after: number | null = null;
      if (lastDate && now.getTime() - Date.parse(lastDate) > 28 * 86400000)
        status = "returning";
      else if (
        sessions.length === 4 &&
        sessions.every(
          (sets) =>
            sets.length >= Number(ex.sets || 3) &&
            sets.length === sessions[0].length &&
            sets.every((row) => row.weight > 0 && row.reps > 0),
        ) &&
        !ex.technique &&
        !ex.phases
      ) {
        const volume = (sets: FollowupSet[]) =>
          sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
        before = volume(sessions[3]);
        after = volume(sessions[0]);
        const values = sessions.map(volume);
        const spread =
          (Math.max(...values) - Math.min(...values)) / Math.max(...values);
        const span =
          Date.parse(sessions[0][0].created_at) -
          Date.parse(sessions[3][0].created_at);
        status =
          spread <= 0.02 && span >= 21 * 86400000
            ? "stable"
            : after > before * 1.02
              ? "improving"
              : after < before * 0.98
                ? "declining"
                : "insufficient";
      }
      result.push({
        key,
        name,
        dayIndex,
        exerciseIndex,
        status,
        sessions: sessions.length,
        lastDate,
        volumeBefore: before,
        volumeAfter: after,
      });
    }
  }
  return result;
}
