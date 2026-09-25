import { describe, expect, it } from "vitest";
import {
  monthlyReviewDue,
  analyzeTrainingContinuity,
} from "@/lib/training/followup-analysis";
import {
  DEFAULT_FOLLOWUP,
  followupPreferencesSchema,
} from "@/lib/training/followup-preferences";
import {
  addDropStage,
  addWorkoutSet,
  canAddWorkoutSet,
  configureFst7,
} from "@/lib/training/technique-execution";
import { normalizeWorkoutDraftExercises } from "@/lib/training/active-workout-draft";

describe("optional training follow-up", () => {
  it("defaults off and refuses injected owner or unknown settings", () => {
    expect(DEFAULT_FOLLOWUP).toEqual({
      enabled: false,
      monthly_review: false,
      advanced_techniques: false,
    });
    expect(
      followupPreferencesSchema.safeParse({
        ...DEFAULT_FOLLOWUP,
        user_id: "other",
      }).success,
    ).toBe(false);
  });
  it("handles calendar months rather than a fixed number of days", () => {
    expect(
      monthlyReviewDue(
        { days: [], start_date: "2026-01-31" },
        new Date("2026-02-28T13:00:00Z"),
      ),
    ).toBe(true);
    expect(
      monthlyReviewDue(
        { days: [], start_date: "2026-01-31" },
        new Date("2026-02-27T13:00:00Z"),
      ),
    ).toBe(false);
  });
  it("requires four comparable sessions over three weeks before suggesting a review", () => {
    const rows = Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 3 }, () => ({
        session_id: `s${i}`,
        exercise_name: "Row",
        weight: 20,
        reps: 12,
        created_at: new Date(Date.UTC(2026, 8, 21 - i * 7, 12)).toISOString(),
      })),
    ).flat();
    const program = { days: [{ exercises: [{ name: "Row", sets: 3 }] }] };
    expect(
      analyzeTrainingContinuity(
        program,
        rows,
        new Date("2026-09-21T13:00:00Z"),
      )[0].status,
    ).toBe("stable");
    expect(
      analyzeTrainingContinuity(
        program,
        rows.slice(0, 9),
        new Date("2026-09-21T13:00:00Z"),
      )[0].status,
    ).toBe("insufficient");
    expect(
      analyzeTrainingContinuity(
        program,
        rows.map((row) => ({ ...row, technique: "dropset" })),
        new Date("2026-09-21T13:00:00Z"),
      )[0].status,
    ).toBe("insufficient");
  });
  it("preserves drop stages through draft normalization and leaves load blank", () => {
    const ex = normalizeWorkoutDraftExercises([
      { name: "Row", sets: 3, reps: "8-12" },
    ])[0];
    const drop = addDropStage(ex);
    expect(drop.sets).toHaveLength(4);
    expect(drop.sets[3].parentSetNumber).toBe(3);
    expect(drop.sets[3].weight).toBe("");
    expect(
      normalizeWorkoutDraftExercises([drop])[0].sets[3].parentSetNumber,
    ).toBe(3);
    expect(ex.sets).toHaveLength(3);
  });
  it("configures exactly seven sets without erasing entered loads or completed work", () => {
    const ex = normalizeWorkoutDraftExercises([
      { name: "Row", sets: 3, reps: 12 },
    ])[0];
    ex.sets[0].weight = 20;
    ex.sets[0].weightRaw = "20";
    const fst = configureFst7(ex);
    expect(fst.sets).toHaveLength(7);
    expect(fst.sets[0].weight).toBe(20);
    expect(fst.rest).toBe(45);
    expect(fst.technique).toBe("fst7");
    expect(addDropStage(fst)).toBe(fst);
    ex.sets[0].done = true;
    expect(configureFst7(ex)).toBe(ex);
  });
  it("adds a set to a partly completed exercise and keeps its log intact", () => {
    const exercise = normalizeWorkoutDraftExercises([{name:"Row",sets:2,reps:10}])[0];
    exercise.sets[0].done = true;
    exercise.sets[0].weight = 30;
    const updated = addWorkoutSet([exercise],0)![0];
    expect(updated.targetSets).toBe(3);
    expect(updated.sets.map(set => set.num)).toEqual([1,2,3]);
    expect(updated.sets[0].weight).toBe(30);
    expect(updated.sets[0].done).toBe(true);
    expect(updated.sets[2].done).toBe(false);
    expect(normalizeWorkoutDraftExercises([updated])).toEqual([updated]);
  });
  it("adds a complete extra round to a biset and preserves A/B navigation", () => {
    const pair = normalizeWorkoutDraftExercises([{name:"A",sets:1,technique:"superset",technique_details:"B"},{name:"B",sets:1}]);
    const updated = addWorkoutSet(pair,1)!;
    expect(updated.map(exercise => exercise.targetSets)).toEqual([2,2]);
    expect(updated.map(exercise => exercise.sets.length)).toEqual([2,2]);
    expect(pair.map(exercise => exercise.sets.length)).toEqual([1,1]);
  });
  it("inserts an extra main set before unlogged drop stages, but never rewrites a logged stage", () => {
    const exercise = normalizeWorkoutDraftExercises([{name:"Row",sets:2,technique:"dropset",technique_details:"2"}])[0];
    const updated = addWorkoutSet([exercise],0)![0];
    expect(updated.sets.map(set => [set.num,set.parentSetNumber])).toEqual([[1,undefined],[2,undefined],[3,undefined],[4,3],[5,4]]);
    updated.sets[3].done = true;
    expect(canAddWorkoutSet([updated],0)).toBe(false);
    expect(addWorkoutSet([updated],0)).toBeNull();
  });
  it("keeps FST-7 fixed at seven and caps ordinary sets at ten", () => {
    const fst = normalizeWorkoutDraftExercises([{name:"A",sets:7,technique:"fst7"}]);
    expect(canAddWorkoutSet(fst,0)).toBe(false);
    const full = normalizeWorkoutDraftExercises([{name:"A",sets:10}]);
    expect(addWorkoutSet(full,0)).toBeNull();
  });
});
