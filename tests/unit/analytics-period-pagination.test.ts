import { expect, it, vi } from "vitest";
import { readAnalyticsPages } from "@/lib/progression/analytics-daily-read";
import {
  buildProgressionViewModel,
  type ProgressionPeriod,
} from "@/lib/progression/progression-dashboard-model";
const base = {
  now: new Date("2026-10-06T12:00:00Z"),
  weight: { logs: [] },
  records: { rows: [] },
  measurements: { rows: [] },
  photos: { rows: [] },
  wellbeing: { rows: [] },
};
const session = (date: string) => ({
  created_at: date + "T12:00:00Z",
  completed: true,
  workout_sets: [{ completed: true, weight: 10, reps: 10 }],
});
it("filters sessions and tonnage at the exact period boundary and retains old history for all", () => {
  const sessions = {
    rows: [
      "2026-04-01",
      "2026-09-29",
      "2026-09-30",
      "2026-10-06",
      "2026-10-07",
    ].map(session),
  };
  for (const [period, count] of [
    ["7d", 2],
    ["30d", 3],
    ["all", 4],
  ] as [ProgressionPeriod, number][]) {
    const m = buildProgressionViewModel({ ...base, period, sessions });
    expect(m.regularity.weeks.reduce((s, w) => s + w.completed, 0)).toBe(count);
    expect(m.volume.weeklyVolume.reduce((s, w) => s + w.volume, 0)).toBe(
      count * 100,
    );
  }
});
it("loads every page without duplicating entries", async () => {
  const rows = [1, 2, 3, 4, 5];
  const read = vi.fn(async (from: number, to: number) => ({
    data: rows.slice(from, to + 1),
    error: null,
  }));
  expect(await readAnalyticsPages(read, 2, 10)).toEqual({
    data: rows,
    error: null,
    truncated: false,
  });
  expect(read.mock.calls).toEqual([
    [0, 1],
    [2, 3],
    [4, 5],
  ]);
});
it("reports the safety ceiling as partial", async () => {
  expect(
    await readAnalyticsPages(async () => ({ data: [1, 2], error: null }), 2, 4),
  ).toMatchObject({ truncated: true });
});
it("does not use partial totals when a later page fails", async () => {
  let page = 0;
  const result = await readAnalyticsPages(
    async () =>
      ++page === 1
        ? { data: [1, 2], error: null }
        : { data: null, error: "offline" },
    2,
    10,
  );
  expect(result).toEqual({ data: [], error: "offline", truncated: false });
});
