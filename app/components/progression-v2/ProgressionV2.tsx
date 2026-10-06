"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, Plus, X, Trophy } from "lucide-react";
import {
  PROGRESSION_MEASUREMENT_FIELDS,
  type ProgressionMeasurementField,
  type ProgressionPeriod,
  type ProgressionViewModel,
} from "../../../lib/progression/progression-dashboard-model";
import type {
  AnalyticsSourceStates,
  ProgressionWellbeingEntry,
} from "../../hooks/useAnalytics";
import { getProgressionDateKey } from "../../../lib/progression/progression-date";
import { RailOverlay } from "../ui/RailOverlay";
import PersonalRecordsV2 from "./PersonalRecordsV2";
import ExerciseProgression from "./ExerciseProgression";
import InteractiveTrend from "./InteractiveTrend";
import { type AdvancedWorkoutSession } from "../AnalyticsSection";
import homeStyles from "../home-v2/HomeV2.module.css";
import styles from "./AnalyticsCompact.module.css";

export type ProgressionSection = "summary" | "body" | "sport" | "daily";
export interface DailyCalories {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
export interface ProgressionV2Props {
  model: ProgressionViewModel;
  onPeriodChange: (period: ProgressionPeriod) => void;
  onAddWeight: () => void;
  onAddBodyMeasurement: () => void;
  onAddPhoto: () => void;
  activeSection: ProgressionSection;
  onSectionNavigate: (section: ProgressionSection) => void;
  photos: ReactNode;
  advanced: ReactNode;
  children: ReactNode;
  calories: DailyCalories[];
  water: { date: string; ml: number }[];
  checkins: ProgressionWellbeingEntry[];
  dailyStates: AnalyticsSourceStates;
  dailyTruncated: boolean;
  sessions: AdvancedWorkoutSession[];
}

export default function ProgressionV2({
  model,
  onPeriodChange,
  onAddWeight,
  onAddBodyMeasurement,
  onAddPhoto,
  activeSection,
  onSectionNavigate,
  photos,
  advanced,
  children,
  calories,
  water,
  checkins,
  dailyStates,
  dailyTruncated,
  sessions,
}: ProgressionV2Props) {
  const t = useTranslations("analyticsCompact"),
    old = useTranslations("progress.v2"),
    load = useTranslations("trainingLoad"),
    locale = useLocale();
  const [metric, setMetric] = useState<"weight" | "sessions" | "volume">(
    "weight",
  );
  const [bodyMetric, setBodyMetric] = useState<
    "weight" | ProgressionMeasurementField
  >("weight");
  const [dailyMetric, setDailyMetric] = useState<
    "sleep" | "calories" | "water"
  >("sleep");
  const [addOpen, setAddOpen] = useState(false);
  const n = (v: number | null | undefined, digits = 1) =>
    v == null || !Number.isFinite(v)
      ? "—"
      : v.toLocaleString(locale, { maximumFractionDigits: digits });
  const date = (d: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(d.slice(0, 10) + "T12:00:00Z"));
  const inPeriod = (d: string) =>
    (!model.period.start || d >= model.period.start) && d <= model.period.end;
  const selectedSessions = sessions
    .filter(
      (s) =>
        s.completed !== false &&
        s.created_at &&
        inPeriod(getProgressionDateKey(s.created_at)!),
    )
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const cals =
    dailyStates.nutrition === "ready"
      ? calories.filter((r) => inPeriod(r.date))
      : [];
  const waters =
    dailyStates.hydration === "ready"
      ? water.filter((r) => inPeriod(r.date))
      : [];
  const checks =
    dailyStates.wellbeing === "ready"
      ? checkins.filter((r) => inPeriod(r.date))
      : [];
  const sleeps = checks
    .filter((r) => r.sleep_hours != null && Number.isFinite(r.sleep_hours))
    .map((r) => ({ date: r.date, value: r.sleep_hours! }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const average = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const totalSessions =
    model.regularity.state === "error" || model.regularity.state === "loading"
      ? null
      : model.regularity.weeks.reduce((sum, w) => sum + w.completed, 0);
  const totalVolume =
    model.volume.state === "error" || model.volume.state === "loading"
      ? null
      : model.volume.weeklyVolume.reduce((sum, w) => sum + w.volume, 0);
  const summaryPoints =
    metric === "weight"
      ? model.weight.series
      : metric === "sessions"
        ? model.regularity.weeks.map((w) => ({
            date: w.weekKey,
            value: w.completed,
          }))
        : model.volume.weeklyVolume.map((w) => ({
            date: w.weekKey,
            value: w.volume,
          }));
  const bodyPoints =
    bodyMetric === "weight"
      ? model.weight.series
      : (model.measurements.fields[bodyMetric]?.series ?? []);
  const dailyPoints =
    dailyMetric === "sleep"
      ? sleeps
      : dailyMetric === "calories"
        ? cals.map((r) => ({ date: r.date, value: r.calories }))
        : waters.map((r) => ({ date: r.date, value: r.ml / 1000 }));
  const dailyState =
    dailyStates[
      dailyMetric === "sleep"
        ? "wellbeing"
        : dailyMetric === "calories"
          ? "nutrition"
          : "hydration"
    ];
  const moods = checks
    .filter((r) => r.mood)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.mood!] = (acc[r.mood!] ?? 0) + 1;
      return acc;
    }, {});
  const mood = Object.keys(moods).sort((a, b) => moods[b] - moods[a])[0];
  const moodLabel = (value: string | null | undefined) =>
    value && ["fatigue", "normal", "bien", "top", "energie"].includes(value)
      ? t(`moods.${value}`)
      : value || "—";
  const lastRecord = model.records.items[0];
  const domainState = (state: string) =>
    state === "loading" || state === "error" ? (
      <p className={styles.notice} role="status">
        {old(state === "loading" ? "states.loading" : "states.unavailable")}
      </p>
    ) : null;
  const stat = (label: string, value: string, note?: string) => (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
  const journalDates = [
    ...new Set([...cals, ...waters, ...checks].map((r) => r.date)),
  ]
    .sort()
    .reverse();
  return (
    <section className={styles.shell} data-progression-v2>
      <header className={styles.header}>
        <h1 className={homeStyles.title}>
          {t("titleLead")}
          <br />
          <em>{t("titleAccent")}</em>
        </h1>
        <button
          type="button"
          className={styles.measureButton}
          onClick={() => setAddOpen(true)}
        >
          <Plus size={16} aria-hidden="true" />
          {t("add")}
        </button>
      </header>
      <p className={styles.periodCaption}>
        {model.period.start
          ? `${date(model.period.start)} — ${date(model.period.end)}`
          : t("availableHistory")}
      </p>
      <div
        className={styles.periods}
        role="group"
        aria-label={old("periodLabel")}
      >
        {(["7d", "30d", "90d", "all"] as const).map((period) => (
          <button
            key={period}
            type="button"
            aria-pressed={model.period.key === period}
            onClick={() => onPeriodChange(period)}
          >
            {old(`periods.${period}`)}
          </button>
        ))}
      </div>
      <nav className={styles.tabs} aria-label={t("navigation")}>
        {(["summary", "body", "sport", "daily"] as const).map((section) => (
          <button
            type="button"
            key={section}
            aria-pressed={activeSection === section}
            onClick={() => onSectionNavigate(section)}
          >
            {t(`tabs.${section}`)}
          </button>
        ))}
      </nav>
      {model.period.isTruncated && (
        <p className={styles.notice}>{t("limited")}</p>
      )}
      {activeSection === "summary" && (
        <>
          <section className={styles.card}>
            <h2>{t("essentials")}</h2>
            <div className={styles.metrics}>
              {(["weight", "sessions", "volume"] as const).map((key) => (
                <button
                  type="button"
                  key={key}
                  aria-pressed={metric === key}
                  onClick={() => setMetric(key)}
                >
                  <span>{t(key)}</span>
                  <strong>
                    {key === "weight"
                      ? `${n(model.weight.current)} kg`
                      : key === "sessions"
                        ? n(totalSessions, 0)
                        : `${n(totalVolume == null ? null : totalVolume / 1000)} t`}
                  </strong>
                  <small>
                    {t(key === "weight" ? "lastMeasure" : "inPeriod")}
                  </small>
                </button>
              ))}
            </div>
            {domainState(
              metric === "weight"
                ? model.weight.state
                : metric === "sessions"
                  ? model.regularity.state
                  : model.volume.state,
            )}
            <InteractiveTrend
              key={metric + model.period.key}
              points={summaryPoints}
              unit={
                metric === "weight"
                  ? "kg"
                  : metric === "sessions"
                    ? t("sessions")
                    : "kg"
              }
              title={t(`charts.${metric}`)}
            />
            {metric !== "weight" && (
              <p className={styles.small}>{t("partialWeeks")}</p>
            )}
            <button
              type="button"
              className={styles.link}
              onClick={() =>
                onSectionNavigate(metric === "weight" ? "body" : "sport")
              }
            >
              {t("explore")}
              <ChevronRight size={18} />
            </button>
          </section>
          <section className={styles.card}>
            <div className={styles.row}>
              <h2>{t("latestRecord")}</h2>
              <Trophy size={20} aria-hidden="true" />
            </div>
            {domainState(model.records.state)}
            {lastRecord ? (
              <>
                <h3>{lastRecord.exerciseName}</h3>
                <p className={styles.small}>
                  {load(lastRecord.loadMode ?? "legacy")} ·{" "}
                  {lastRecord.recordedAt ? date(lastRecord.recordedAt) : ""}
                </p>
                <strong>
                  {n(lastRecord.value)} {lastRecord.unit}{" "}
                  {lastRecord.estimated
                    ? old("exercise.metrics.estimated1rm")
                    : ""}
                </strong>
              </>
            ) : (
              <p className={styles.small}>{old("states.insufficient")}</p>
            )}
            <button
              type="button"
              className={styles.link}
              onClick={() => onSectionNavigate("sport")}
            >
              {t("records")}
              <ChevronRight size={18} />
            </button>
          </section>
        </>
      )}
      {activeSection === "body" && (
        <>
          <section className={styles.card}>
            <h2>{t("bodyTitle")}</h2>
            <div className={styles.grid}>
              {stat(
                t("weight"),
                `${n(model.weight.current)} kg`,
                `${t("target")} : ${n(model.weight.target)} kg`,
              )}
              {stat(
                old("measurements.fields.waist"),
                `${n(model.measurements.fields.waist?.current)} cm`,
              )}
            </div>
            <label className={styles.selectorLabel} htmlFor="analytics-body">
              {t("evolutionOf")}
            </label>
            <select
              id="analytics-body"
              className={styles.select}
              value={bodyMetric}
              onChange={(e) =>
                setBodyMetric(e.target.value as typeof bodyMetric)
              }
            >
              <option value="weight">{t("weight")} · kg</option>
              {PROGRESSION_MEASUREMENT_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {old(`measurements.fields.${f}`)} · cm
                </option>
              ))}
            </select>
            {domainState(
              bodyMetric === "weight"
                ? model.weight.state
                : model.measurements.state,
            )}
            <InteractiveTrend
              key={bodyMetric + model.period.key}
              points={bodyPoints}
              unit={bodyMetric === "weight" ? "kg" : "cm"}
              title={
                bodyMetric === "weight"
                  ? t("weight")
                  : old(`measurements.fields.${bodyMetric}`)
              }
            />
            <details className={styles.details}>
              <summary>{t("allMeasurements")}</summary>
              <div className={styles.grid}>
                {PROGRESSION_MEASUREMENT_FIELDS.map((f) => (
                  <div key={f}>
                    {stat(
                      old(`measurements.fields.${f}`),
                      `${n(model.measurements.fields[f]?.current)} cm`,
                    )}
                  </div>
                ))}
              </div>
            </details>
            <button
              type="button"
              className={styles.link}
              onClick={onAddBodyMeasurement}
            >
              {old("measurements.add")}
              <Plus size={18} />
            </button>
          </section>
          {photos}
        </>
      )}
      {activeSection === "sport" && (
        <>
          <ExerciseProgression exerciseProgress={model.exerciseProgress} />
          <details className={styles.card}>
            <summary>{t("records")}</summary>
            <p className={styles.small}>{t("recordScope")}</p>
            <PersonalRecordsV2 records={model.records} />
          </details>
          {advanced}
          <section className={styles.card}>
            <h2>{t("sessionsHistory")}</h2>
            {domainState(model.regularity.state)}
            {!selectedSessions.length && (
              <p className={styles.small}>{old("states.insufficient")}</p>
            )}
            {selectedSessions.slice(0, 10).map((s, i) => (
              <details
                className={styles.details}
                key={s.id ?? `${s.created_at}:${i}`}
              >
                <summary>
                  {s.created_at
                    ? date(getProgressionDateKey(s.created_at)!)
                    : "—"}{" "}
                  · {s.name || t("session")}
                </summary>
                {(s.workout_sets ?? [])
                  .filter((set) => set.completed !== false)
                  .map((set, j) => (
                    <div className={styles.dataRow} key={j}>
                      <span>
                        {set.exercise_name ?? t("exercise")}
                        <small>{load(set.load_mode ?? "legacy")}</small>
                      </span>
                      <strong>
                        {set.duration_seconds
                          ? `${n(set.duration_seconds)} s`
                          : `${n(set.weight)} kg × ${n(set.reps, 0)}`}
                      </strong>
                    </div>
                  ))}
              </details>
            ))}
            {selectedSessions.length > 10 && (
              <details className={styles.details}>
                <summary>
                  {t("olderSessions", { count: selectedSessions.length - 10 })}
                </summary>
                {selectedSessions.slice(10).map((s, i) => (
                  <details
                    className={styles.details}
                    key={s.id ?? `${s.created_at}:${i}`}
                  >
                    <summary>
                      {s.created_at
                        ? date(getProgressionDateKey(s.created_at)!)
                        : "—"}{" "}
                      · {s.name || t("session")}
                    </summary>
                    {(s.workout_sets ?? [])
                      .filter((set) => set.completed !== false)
                      .map((set, j) => (
                        <div className={styles.dataRow} key={j}>
                          <span>
                            {set.exercise_name ?? t("exercise")}
                            <small>{load(set.load_mode ?? "legacy")}</small>
                          </span>
                          <strong>
                            {set.duration_seconds
                              ? `${n(set.duration_seconds)} s`
                              : `${n(set.weight)} kg × ${n(set.reps, 0)}`}
                          </strong>
                        </div>
                      ))}
                  </details>
                ))}
              </details>
            )}
          </section>
        </>
      )}
      {activeSection === "daily" && (
        <section className={styles.card}>
          <h2>{t("dailyTitle")}</h2>
          <p className={styles.small}>{t("averages")}</p>
          {dailyTruncated && <p className={styles.notice}>{t("limited")}</p>}
          <div className={styles.grid}>
            {stat(
              t("sleep"),
              `${n(average(sleeps.map((s) => s.value)))} h`,
              t("daysRecorded", { count: sleeps.length }),
            )}
            {stat(t("mood"), moodLabel(mood), t("mostFrequent"))}
            {stat(
              t("intake"),
              `${n(average(cals.map((r) => r.calories)), 0)} kcal`,
              t("daysRecorded", { count: cals.length }),
            )}
            {stat(
              t("water"),
              `${n(average(waters.map((r) => r.ml / 1000)))} L`,
              t("daysRecorded", { count: waters.length }),
            )}
          </div>
          {Object.values(dailyStates).includes("error") && (
            <p className={styles.notice} role="status">
              {old("states.unavailableCopy")}
            </p>
          )}
          <label className={styles.selectorLabel} htmlFor="analytics-daily">
            {t("evolutionOf")}
          </label>
          <select
            className={styles.select}
            id="analytics-daily"
            value={dailyMetric}
            onChange={(e) =>
              setDailyMetric(e.target.value as typeof dailyMetric)
            }
          >
            <option value="sleep">{t("sleep")} · h</option>
            <option value="calories">{t("intake")} · kcal</option>
            <option value="water">{t("water")} · L</option>
          </select>
          {domainState(dailyState)}
          <InteractiveTrend
            key={dailyMetric + model.period.key}
            points={dailyPoints}
            unit={
              dailyMetric === "sleep"
                ? "h"
                : dailyMetric === "calories"
                  ? "kcal"
                  : "L"
            }
            title={t(dailyMetric === "calories" ? "intake" : dailyMetric)}
          />
          <details className={styles.details}>
            <summary>{t("macros")}</summary>
            {(["protein", "carbs", "fat"] as const).map((key) => (
              <div className={styles.dataRow} key={key}>
                <span>{t(key)}</span>
                <strong>{n(average(cals.map((r) => r[key])))} g</strong>
              </div>
            ))}
          </details>
          <details className={styles.details}>
            <summary>{t("dailyHistory")}</summary>
            {journalDates.map((d) => {
              const c = cals.find((r) => r.date === d),
                w = waters.find((r) => r.date === d),
                ch = checks.find((r) => r.date === d);
              return (
                <div className={styles.dataRow} key={d}>
                  <span>
                    {date(d)}
                    <small>
                      {moodLabel(ch?.mood)} · {n(ch?.sleep_hours)} h
                    </small>
                  </span>
                  <span>
                    {n(c?.calories, 0)} kcal
                    <small>{n(w ? w.ml / 1000 : null)} L</small>
                  </span>
                </div>
              );
            })}
            <p className={styles.small}>{t("missingDays")}</p>
          </details>
        </section>
      )}
      <details className={styles.exports}>
        <summary>{t("dataExports")}</summary>
        <p className={styles.small}>{t("exportScope")}</p>
        {(model.period.isTruncated || dailyTruncated) && (
          <p className={styles.notice}>{t("limited")}</p>
        )}
        {children}
      </details>
      <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
        <Dialog.Portal>
          <RailOverlay>
            <Dialog.Overlay className={styles.backdrop} />
            <Dialog.Content
              className={styles.dialog}
            >
              <div className={styles.row}>
                <Dialog.Title>{t("addTitle")}</Dialog.Title>
                <Dialog.Close className={styles.close} aria-label={t("close")}>
                  <X size={20} />
                </Dialog.Close>
              </div>
              <Dialog.Description
                className={styles.small}
              >
                {t("addDescription")}
              </Dialog.Description>
              {[
                [t("weight"), onAddWeight],
                [t("allMeasurements"), onAddBodyMeasurement],
                [t("photo"), onAddPhoto],
              ].map(([label, action]) => (
                <button
                  type="button"
                  key={label as string}
                  className={styles.link}
                  onClick={() => {
                    setAddOpen(false);
                    (action as () => void)();
                  }}
                >
                  {label as string}
                  <ChevronRight size={18} />
                </button>
              ))}
            </Dialog.Content>
          </RailOverlay>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
