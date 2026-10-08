// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import ProgressionV2, {
  type ProgressionSection,
  type ProgressionV2Props,
} from "@/app/components/progression-v2/ProgressionV2";
import { buildProgressionViewModel } from "@/lib/progression/progression-dashboard-model";
import messages from "@/messages/fr.json";

const base = {
  now: new Date("2026-10-06T12:00:00Z"),
  weight: {
    logs: [
      { date: "2026-10-06", poids: 65 },
      { date: "2026-09-08", poids: 66 },
    ],
  },
  sessions: { rows: [] },
  records: { rows: [] },
  measurements: { rows: [] },
  photos: { rows: [] },
  wellbeing: { rows: [] },
};
const onAddWeight = vi.fn(),
  onAddBodyMeasurement = vi.fn(),
  onAddPhoto = vi.fn();
type Model = ProgressionV2Props["model"];
function Harness({ failed = false, transform = (model: Model) => model }: { failed?: boolean; transform?: (model: Model) => Model }) {
  const [section, setSection] = useState<ProgressionSection>("summary");
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  return React.createElement(ProgressionV2, {
    model: transform(buildProgressionViewModel({ ...base, period })),
    onPeriodChange: setPeriod,
    onAddWeight,
    onAddBodyMeasurement,
    onAddPhoto,
    activeSection: section,
    onSectionNavigate: setSection,
    photos: React.createElement("p", null, "Photos privées"),
    advanced: React.createElement("p", null, "Analyses musculaires"),
    children: React.createElement("p", null, "Export"),
    calories: [
      { date: "2026-10-06", calories: 2400, protein: 120, carbs: 300, fat: 80 },
      { date: "2026-09-08", calories: 1800, protein: 90, carbs: 230, fat: 70 },
    ],
    water: [{ date: "2026-10-06", ml: 0 }],
    checkins: [
      { date: "2026-10-06", sleep_hours: 7.5, mood: "bien", note: null },
    ],
    dailyStates: {
      records: "ready",
      nutrition: failed ? "error" : "ready",
      hydration: "ready",
      wellbeing: "ready",
    },
    dailyTruncated: false,
    sessions: [],
  });
}
function mount(failed = false, transform?: (model: Model) => Model) {
  return render(
    React.createElement(NextIntlClientProvider, {
      locale: "fr",
      messages,
      timeZone: "Europe/Zurich",
      children: React.createElement(Harness, { failed, transform }),
    }),
  );
}
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("shows only the chosen view, retaining access to photos and sport details", () => {
  mount();
  expect(screen.getByRole("heading", { name: "Les essentiels" })).toBeTruthy();
  expect(screen.queryByText("Photos privées")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Corps" }));
  expect(screen.queryByRole("heading", { name: "Les essentiels" })).toBeNull();
  expect(screen.getByText("Photos privées")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sport" }));
  expect(screen.queryByText("Photos privées")).toBeNull();
  expect(screen.getByText("Analyses musculaires")).toBeTruthy();
});
it("filters daily averages and keeps genuine zero water rather than fabricating missing days", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Suivi" }));
  expect(screen.getByText(/2.?100 kcal/)).toBeTruthy();
  expect(screen.getAllByText("0 L")[0]).toBeTruthy();
  expect(screen.getByText("Bien")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "7 jours" }));
  expect(screen.getAllByText(/2.?400 kcal/)[0]).toBeTruthy();
  expect(screen.queryByText(/2.?100 kcal/)).toBeNull();
});
it("does not show stale nutrition values on read errors", () => {
  mount(true);
  fireEvent.click(screen.getByRole("button", { name: "Suivi" }));
  expect(screen.getAllByText("— kcal")[0]).toBeTruthy();
  expect(screen.queryByText(/2.?100 kcal/)).toBeNull();
});
it("opens the accessible entry chooser and dispatches the requested measurement", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Mesure" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Toutes mes mensurations",
    }),
  );
  expect(onAddBodyMeasurement).toHaveBeenCalledOnce();
  expect(onAddWeight).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("explores a real dated point with the keyboard-compatible range control", () => {
  mount();
  fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
  expect(screen.getByText(/8 sept.*66 kg/)).toBeTruthy();
});

it("switches all four periods and exposes partial history", () => {
  mount(false, model => ({ ...model, period: { ...model.period, isTruncated: true } }));
  for (const name of ["7 jours", "30 jours", "90 jours", messages.progress.v2.periods.all]) {
    const button = screen.getByRole("button", { name });
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  }
  expect(screen.getAllByText(messages.analyticsCompact.limited)[0]).toBeTruthy();
});
it.each(["loading", "error"] as const)("keeps unavailable totals distinct from zero during %s", state => {
  mount(false, model => ({ ...model,
    regularity: { ...model.regularity, state },
    volume: { ...model.volume, state },
  }));
  const sessions = screen.getByRole("button", { name: /Séances.*—/ });
  fireEvent.click(sessions);
  expect(screen.getByRole("status").textContent).toBe(
    messages.progress.v2.states[state === "loading" ? "loading" : "unavailable"]
  );
  const volume = screen.getByRole("button", { name: /Volume.*— t/ });
  fireEvent.click(volume);
  expect(screen.getByRole("status")).toBeTruthy();
});
it("shows an actual zero session total without inventing a percentage", () => {
  mount();
  const sessions = screen.getByRole("button", { name: /Séances\s*0/ });
  expect(sessions.textContent).not.toContain("%");
  expect(screen.getByRole("button", { name: /Volume\s*0 t/ })).toBeTruthy();
});

it("offers all six measurements and plots the selected dated measurement", () => {
  mount(false, model => ({ ...model, measurements: buildProgressionViewModel({
    ...base, period: "30d", measurements: { rows: [
      { date: "2026-10-01", hips: 98, calves: 38 },
      { date: "2026-10-06", hips: 97, calves: 37.5 },
    ] },
  }).measurements }));
  fireEvent.click(screen.getByRole("button", { name: "Corps" }));
  const selector = screen.getByRole("combobox");
  expect(Array.from(selector.querySelectorAll("option")).map(option => option.value))
    .toEqual(["weight", "chest", "waist", "hips", "biceps", "thighs", "calves"]);
  fireEvent.change(selector, { target: { value: "hips" } });
  fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
  expect(screen.getByText(/1 oct.*98 cm/)).toBeTruthy();
  fireEvent.change(selector, { target: { value: "calves" } });
  expect(screen.getByText(/6 oct.*37,5 cm/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: messages.progress.v2.measurements.add }));
  expect(onAddBodyMeasurement).toHaveBeenCalledOnce();
});
it.each(["empty", "error", "loading"] as const)("keeps missing body values unknown when %s", state => {
  mount(false, model => ({ ...model,
    weight: { ...model.weight, state, current: null, target: null, series: [] },
    measurements: { ...model.measurements, state, fields: {} },
  }));
  fireEvent.click(screen.getByRole("button", { name: "Corps" }));
  expect(screen.getByText("— kg")).toBeTruthy();
  expect(screen.getAllByText("— cm").length).toBeGreaterThan(0);
  expect(screen.queryByText("0 kg")).toBeNull();
  expect(screen.queryByRole("slider")).toBeNull();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "waist" } });
  if (state !== "empty") expect(screen.getByRole("status").textContent).toBe(
    messages.progress.v2.states[state === "loading" ? "loading" : "unavailable"]
  );
});
