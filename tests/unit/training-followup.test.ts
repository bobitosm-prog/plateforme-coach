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
});
