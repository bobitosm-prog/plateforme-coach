import { getRestSeconds } from "../utils/exercise";
import { padTo7Days } from "../schedule-utils";
import { phaseKeyAt, trainingMonday } from "./resolve-program";
import { prescribedDuration } from "./exercise-measurement";
import { bisetFor, dropCount, restPausePrescription } from './guided-techniques';

type Row = Record<string, any>;
/** Activation starts a fresh cycle; drafts must preview that same first phase. */
export function editorProgramContext(program: Row | null | undefined): Row | null | undefined {
  return program?.is_active===false ? {...program,start_date:null,current_week:1} : program;
}
export function editorDays(days: Row[]): Row[] {
  // padTo7Days tags days: never let that mutate the live program while editing.
  return padTo7Days(structuredClone(days)).map((day) => ({
    ...day,
    is_rest: Boolean(day.is_rest || day.repos),
  }));
}
export function setDayRest(days: Row[], index: number, rest: boolean): Row[] {
  return days.map((day, i) =>
    i === index ? { ...day, is_rest: rest, repos: rest } : day,
  );
}
export function resizeTrainingDays(days: Row[], count: number): Row[] {
  const result = editorDays(days);
  const active = result.flatMap((day, i) => (!day.is_rest ? [i] : []));
  if (active.length > count) {
    for (const i of active.slice(count))
      result[i] = { ...result[i], is_rest: true, repos: true };
  } else {
    for (const [i, day] of result.entries()) {
      if (active.length >= count) break;
      if (day.is_rest) {
        result[i] = { ...day, is_rest: false, repos: false };
        active.push(i);
      }
    }
  }
  return result;
}
export function editExercise(
  ex: Row,
  field: string,
  value: unknown,
  program: unknown,
  scope: "phase" | "program",
  now = new Date(),
): Row {
  const patch: Row =
    field === "rest" || field === "rest_seconds"
      ? { rest: value, rest_seconds: value }
      : { [field]: value };
  if (field === 'technique') patch.technique_details = value === 'dropset' ? '2' : value === 'restpause' ? '2,15' : '';
  if (field === "duration_seconds") {
    patch.reps = 0;
    patch.targetDurationSeconds = value;
  }
  if (field === "technique" && value === "fst7")
    Object.assign(patch, { sets: 7, reps: "8-12", rest: 45, rest_seconds: 45 });
  const result = { ...ex, ...patch };
  if (ex.phases && Object.keys(ex.phases).length) {
    const resolvedKey = phaseKeyAt(program, now);
    const key = resolvedKey && ex.phases[resolvedKey] ? resolvedKey : "p1";
    if (scope === "phase") Object.assign(result, ex);
    result.phases = Object.fromEntries(
      Object.entries(ex.phases).map(([phase, prescription]) => [
        phase,
        scope === "program" || phase === key
          ? { ...(prescription as Row), ...patch }
          : prescription,
      ]),
    );
  }
  // An explicit manual sets edit supersedes weekly overrides on this exercise.
  if (field === "sets" || (field === "technique" && value === "fst7")) {
    if (scope === "program") delete result._weekly_sets;
    else if (ex._weekly_sets) {
      result._weekly_sets = { ...ex._weekly_sets };
      delete result._weekly_sets[trainingMonday(now)];
    }
  }
  return result;
}
export function validateEditorDays(days: Row[], structureOnly = false): boolean {
  if (
    !Array.isArray(days) ||
    days.some((day) => !day || typeof day !== "object" || Array.isArray(day))
  )
    return false;
  if (
    days.some(
      (day) =>
        (day.is_rest !== undefined && typeof day.is_rest !== "boolean") ||
        (day.repos !== undefined && typeof day.repos !== "boolean") ||
        (day.exercises !== undefined &&
          (!Array.isArray(day.exercises) || day.exercises.length > 30)),
    )
  )
    return false;
  if (
    !days.length ||
    days.length > 7 ||
    !days.some((d) => !d.is_rest && !d.repos && d.exercises?.length)
  )
    return false;
  return days.every(
    (day) =>
      day.is_rest ||
      day.repos ||
      (Array.isArray(day.exercises) &&
        day.exercises.length > 0 &&
        day.exercises.length <= 30 &&
        // Validate each phase as a complete day, not isolated partner text.
        (structureOnly || [null, ...new Set(day.exercises.flatMap((ex: Row) => Object.keys(ex?.phases || {})))].every(phase => {
          const rows = day.exercises.map((ex: Row) => ({ ...ex, ...(phase ? ex?.phases?.[String(phase)] : {}) }));
          const prescriptions = rows.map((ex: Row) => ({ name: String(ex.name || ex.exercise_name || ex.custom_name || ''), technique: ex.technique, techniqueDetails: ex.technique_details, targetSets: Number(ex.sets), targetDurationSeconds: prescribedDuration(ex) || undefined }));
          return prescriptions.every((ex: any, i: number) => (ex.technique !== 'dropset' || (!ex.targetDurationSeconds && dropCount(ex.techniqueDetails) !== null)) && (ex.technique !== 'restpause' || (!ex.targetDurationSeconds && restPausePrescription(ex.techniqueDetails) !== null)) && (ex.technique !== 'superset' || Boolean(bisetFor(prescriptions, i))));
        })) &&
        day.exercises.every((ex: Row) => {
          if (!ex || typeof ex !== "object" || Array.isArray(ex)) return false;
          if (
            ex.phases &&
            (typeof ex.phases !== "object" ||
              Array.isArray(ex.phases) ||
              Object.values(ex.phases).some(
                (p) => !p || typeof p !== "object" || Array.isArray(p),
              ))
          )
            return false;
          const prescriptions = [
            ex,
            ...Object.values(ex.phases || {}).map((p) => ({
              ...ex,
              ...(p as Row),
            })),
          ];
          return prescriptions.every((p) => {
            if (
              !p ||
              typeof p !== "object" ||
              !String(p.name || p.exercise_name || p.custom_name || "").trim()
            )
              return false;
            const sets = Number(p.sets);
            const duration = prescribedDuration(p);
            const rawRest = p.rest_seconds ?? p.rest ?? 90;
            const rawDuration = p.targetDurationSeconds ?? p.duration_seconds;
            if (
              !Number.isFinite(Number(rawRest)) ||
              Number(rawRest) < 1 ||
              Number(rawRest) > 600
            )
              return false;
            if (
              rawDuration != null &&
              (!Number.isInteger(Number(rawDuration)) ||
                Number(rawDuration) < 1 ||
                Number(rawDuration) > 600)
            )
              return false;
            const match = String(p.reps ?? "").match(
              /^(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?$/,
            );
            const min = Number(match?.[1]);
            const max = Number(match?.[2] ?? min);
            return (
              Number.isInteger(sets) &&
              sets >= 1 &&
              sets <= 10 &&
              getRestSeconds(p) >= 1 &&
              getRestSeconds(p) <= 600 &&
              Boolean(
                duration || (match && min >= 1 && max >= min && max <= 100),
              ) &&
              (p.technique !== "fst7" ||
                (!duration &&
                  sets === 7 &&
                  min >= 8 &&
                  max <= 12 &&
                  getRestSeconds(p) >= 30 &&
                  getRestSeconds(p) <= 45))
            );
          });
        })),
  );
}

export interface ProgramTechniqueIssue {
  day: number
  exercise: number
  phase: string | null
  name: string
  code: 'missingDrops' | 'invalidBiset' | 'invalidRestPause'
  inherited: boolean
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>`${JSON.stringify(key)}:${canonical(v)}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}

/** Only unchanged historical technique issues can be carried forward. Numeric/shape validation remains strict. */
export function programTechniqueIssues(days: Row[], baseline: Row[] = []): ProgramTechniqueIssue[] {
  const collect = (source: Row[]) => {
    const issues: (ProgramTechniqueIssue & { fingerprint: string })[] = []
    source.forEach((day, dayIndex) => {
      if (!day || day.is_rest || day.repos || !Array.isArray(day.exercises)) return
      const phases: (string | null)[] = [null, ...new Set<string>(day.exercises.flatMap((ex: Row) => Object.keys(ex?.phases || {})))]
      for (const phase of phases) {
        const rows = day.exercises.map((ex: Row) => ({...ex,...(phase ? ex?.phases?.[phase] : {})}))
        const prescriptions = rows.map((ex: Row) => ({name:String(ex.name || ex.exercise_name || ex.custom_name || ''),technique:ex.technique,techniqueDetails:ex.technique_details,targetSets:Number(ex.sets),targetDurationSeconds:prescribedDuration(ex)||undefined}))
        prescriptions.forEach((ex: typeof prescriptions[number], i: number) => {
          const code = ex.technique === 'dropset' && (ex.targetDurationSeconds || !dropCount(ex.techniqueDetails)) ? 'missingDrops' : ex.technique === 'superset' && !bisetFor(prescriptions,i) ? 'invalidBiset' : ex.technique === 'restpause' && (ex.targetDurationSeconds || !restPausePrescription(ex.techniqueDetails)) ? 'invalidRestPause' : null
          if (!code) return
          // Include partner/claimant prescriptions so changing a relationship cannot inherit an old warning.
          const related = ex.technique === 'superset' ? prescriptions.filter((other: typeof ex, j: number) => j !== i && (other.name === ex.techniqueDetails || other.techniqueDetails === ex.name || other.name === ex.name)) : []
          const { phases: _phases, ...prescription } = rows[i]
          issues.push({day:dayIndex,exercise:i,phase,name:ex.name,code,inherited:false,fingerprint:canonical({prescription,related})})
        })
      }
    })
    return issues
  }
  const previous = collect(baseline)
  return collect(days).map(({fingerprint,...issue})=>({...issue,inherited:previous.some(old=>old.day===issue.day && old.exercise===issue.exercise && old.phase===issue.phase && old.code===issue.code && old.fingerprint===fingerprint)}))
}

export function validateProgramEdit(days: Row[], baseline: Row[] = []): boolean {
  return validateEditorDays(days, true) && programTechniqueIssues(days, baseline).every(issue=>issue.inherited)
}
export function programSource(
  source: unknown,
): "sourceAi" | "sourceImport" | "sourceManual" {
  return source === "ai" || source === "athena_monthly"
    ? "sourceAi"
    : source === "import"
      ? "sourceImport"
      : "sourceManual";
}
export function programSessionCount(days: Row[]): number {
  return days.filter((d) => !d.is_rest && !d.repos && d.exercises?.length)
    .length;
}

export const editorDraftKey = (userId: string, programId?: string) =>
  `moovx_program_draft_v1:${userId}:${programId || "new"}`;
export function readEditorDraft(
  raw: string | null,
  baseline: string,
  now = Date.now(),
): { name: string; days: Row[]; aiResult?: Row } | null {
  try {
    const value = JSON.parse(raw || "null");
    if (
      !value ||
      value.baseline !== baseline ||
      !Number.isFinite(value.savedAt) ||
      now - value.savedAt > 7 * 86400000 ||
      value.savedAt > now ||
      typeof value.name !== "string" ||
      !Array.isArray(value.days) ||
      value.days.length > 7 ||
      value.days.some((d: unknown) => !d || typeof d !== "object")
    )
      return null;
    return {
      name: value.name,
      days: value.days,
      aiResult:
        value.aiResult && typeof value.aiResult === "object"
          ? value.aiResult
          : undefined,
    };
  } catch {
    return null;
  }
}
