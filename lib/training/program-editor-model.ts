export const PROGRAM_EDITOR_DAY_NAMES = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche',
] as const

export type ProgramEditorSource = 'manual' | 'ai'
export type ProgramEditorTechnique = 'dropset' | 'restpause' | 'superset' | 'mechanical'

export interface ProgramEditorExercise {
  id?: string | null
  exercise_id?: string | null
  name?: string | null
  exercise_name?: string | null
  custom_name?: string | null
  muscle_group?: string | null
  focus?: string | null
  sets?: number | string | null
  reps?: number | string | null
  rest?: number | string | null
  rest_seconds?: number | string | null
  tempo?: string | null
  technique?: ProgramEditorTechnique | string | null
  technique_details?: string | null
  isCustom?: boolean
  [key: string]: unknown
}

export interface ProgramEditorDay {
  name?: string | null
  weekday: string
  is_rest?: boolean
  exercises?: ProgramEditorExercise[] | null
  [key: string]: unknown
}

export interface ProgramEditorState {
  name: string
  description: string
  source: ProgramEditorSource
  days: ProgramEditorDay[]
}

export interface ProgramEditorIssue {
  code: 'invalid_program' | 'invalid_day' | 'invalid_exercise' | 'name_required' | 'invalid_day_count'
  path: string
}

export interface ProgramEditorNormalization {
  days: ProgramEditorDay[]
  issues: ProgramEditorIssue[]
}

export type ProgramEditorValidation =
  | { ok: true; value: ProgramEditorState }
  | { ok: false; errors: ProgramEditorIssue[] }

export interface ProgramExercisePosition {
  dayIndex: number
  exerciseIndex: number
}

export type ProgramExerciseMoveResult =
  | { ok: true; changed: boolean; days: ProgramEditorDay[] }
  | { ok: false; reason: 'invalid_source' | 'invalid_destination' | 'cross_day_not_supported'; days: ProgramEditorDay[] }

export interface LegacyProgramPayload {
  user_id: string
  name: string
  description: string
  days: ProgramEditorDay[]
  source: ProgramEditorSource
  updated_at: string
}

const MAX_VALIDATION_ERRORS = 20

export function normalizeProgramEditorDays(input: unknown): ProgramEditorNormalization {
  const issues: ProgramEditorIssue[] = []
  const source = Array.isArray(input) ? input.slice(0, 7) : []
  if (!Array.isArray(input) && input !== undefined && input !== null) {
    issues.push({ code: 'invalid_program', path: 'days' })
  }

  const days = PROGRAM_EDITOR_DAY_NAMES.map((weekday, dayIndex): ProgramEditorDay => {
    const candidate = source[dayIndex]
    if (candidate === undefined) return createRestDay(weekday)
    if (!isRecord(candidate)) {
      pushIssue(issues, { code: 'invalid_day', path: `days.${dayIndex}` })
      return createRestDay(weekday)
    }

    let exercises: ProgramEditorExercise[] | null | undefined
    if (Array.isArray(candidate.exercises)) {
      const validExercises: ProgramEditorExercise[] = []
      candidate.exercises.forEach((exercise, exerciseIndex) => {
        if (!isRecord(exercise)) {
          pushIssue(issues, { code: 'invalid_exercise', path: `days.${dayIndex}.exercises.${exerciseIndex}` })
          return
        }
        validExercises.push(cloneRecord(exercise) as ProgramEditorExercise)
      })
      exercises = validExercises
    } else if (candidate.exercises !== undefined && candidate.exercises !== null) {
      pushIssue(issues, { code: 'invalid_exercise', path: `days.${dayIndex}.exercises` })
      exercises = []
    } else {
      exercises = candidate.exercises as null | undefined
    }

    return {
      ...cloneRecord(candidate),
      weekday: typeof candidate.weekday === 'string' && candidate.weekday ? candidate.weekday : weekday,
      ...(exercises === undefined ? {} : { exercises }),
    } as ProgramEditorDay
  })

  return { days, issues }
}

export function createProgramEditorWeek(trainingDayCount: number, existing: unknown = []): ProgramEditorDay[] {
  const count = Math.max(0, Math.min(7, Math.trunc(trainingDayCount)))
  const normalized = normalizeProgramEditorDays(existing).days
  return normalized.map((day, index) => {
    if (index >= count) return createRestDay(PROGRAM_EDITOR_DAY_NAMES[index])
    if (!day.is_rest) return { ...cloneDay(day), weekday: PROGRAM_EDITOR_DAY_NAMES[index] }
    return {
      name: day.name || '',
      weekday: PROGRAM_EDITOR_DAY_NAMES[index],
      is_rest: false,
      exercises: exerciseList(day).map(cloneExercise),
    }
  })
}

export function setProgramDayRest(days: readonly ProgramEditorDay[], dayIndex: number, isRest: boolean): ProgramEditorDay[] {
  if (!isDayIndex(dayIndex)) return cloneDays(days)
  return normalizeProgramEditorDays(days).days.map((day, index) => index === dayIndex
    ? { ...day, is_rest: isRest, exercises: isRest ? [] : exerciseList(day).map(cloneExercise) }
    : cloneDay(day))
}

export function updateProgramDay(days: readonly ProgramEditorDay[], dayIndex: number, patch: Partial<Pick<ProgramEditorDay, 'name' | 'is_rest'>>): ProgramEditorDay[] {
  if (!isDayIndex(dayIndex)) return cloneDays(days)
  return normalizeProgramEditorDays(days).days.map((day, index) => index === dayIndex
    ? { ...day, ...patch, exercises: patch.is_rest ? [] : exerciseList(day).map(cloneExercise) }
    : cloneDay(day))
}

export function addProgramExercise(
  days: readonly ProgramEditorDay[],
  dayIndex: number,
  exercise: ProgramEditorExercise,
  isCustom: boolean,
): ProgramEditorDay[] {
  if (!isDayIndex(dayIndex)) return cloneDays(days)
  const normalized = normalizeProgramEditorDays(days).days
  return normalized.map((day, index) => index === dayIndex
    ? {
        ...day,
        exercises: [...exerciseList(day).map(cloneExercise), {
          id: exercise.id,
          name: exercise.name,
          muscle_group: exercise.muscle_group,
          sets: exercise.sets || 3,
          reps: exercise.reps || 10,
          rest: exercise.rest_seconds || 90,
          isCustom,
        }],
      }
    : cloneDay(day))
}

export function removeProgramExercise(days: readonly ProgramEditorDay[], position: ProgramExercisePosition): ProgramEditorDay[] {
  if (!hasExercise(days, position)) return cloneDays(days)
  const normalized = normalizeProgramEditorDays(days).days
  return normalized.map((day, index) => index === position.dayIndex
    ? { ...day, exercises: exerciseList(day).filter((_, exerciseIndex) => exerciseIndex !== position.exerciseIndex).map(cloneExercise) }
    : cloneDay(day))
}

export function updateProgramExercise(
  days: readonly ProgramEditorDay[],
  position: ProgramExercisePosition,
  field: string,
  value: unknown,
): ProgramEditorDay[] {
  if (!hasExercise(days, position) || !field) return cloneDays(days)
  const normalized = normalizeProgramEditorDays(days).days
  return normalized.map((day, dayIndex) => dayIndex === position.dayIndex
    ? {
        ...day,
        exercises: exerciseList(day).map((exercise, exerciseIndex) => exerciseIndex === position.exerciseIndex
          ? { ...cloneExercise(exercise), [field]: cloneValue(value) }
          : cloneExercise(exercise)),
      }
    : cloneDay(day))
}

export function moveProgramExercise(
  days: readonly ProgramEditorDay[],
  source: ProgramExercisePosition,
  destination: ProgramExercisePosition,
): ProgramExerciseMoveResult {
  const snapshot = cloneDays(days)
  if (!hasExercise(days, source)) return { ok: false, reason: 'invalid_source', days: snapshot }
  if (source.dayIndex !== destination.dayIndex) return { ok: false, reason: 'cross_day_not_supported', days: snapshot }
  const exercises = days[source.dayIndex]?.exercises
  if (!exercises || destination.exerciseIndex < 0 || destination.exerciseIndex >= exercises.length) {
    return { ok: false, reason: 'invalid_destination', days: snapshot }
  }
  if (source.exerciseIndex === destination.exerciseIndex) return { ok: true, changed: false, days: snapshot }

  const normalized = normalizeProgramEditorDays(days).days
  const reordered = exerciseList(normalized[source.dayIndex]).map(cloneExercise)
  const [moved] = reordered.splice(source.exerciseIndex, 1)
  reordered.splice(destination.exerciseIndex, 0, moved)
  normalized[source.dayIndex] = { ...normalized[source.dayIndex], exercises: reordered }
  return { ok: true, changed: true, days: normalized }
}

export function swapProgramDays(days: readonly ProgramEditorDay[], firstIndex: number, secondIndex: number): ProgramEditorDay[] {
  const normalized = normalizeProgramEditorDays(days).days
  if (!isDayIndex(firstIndex) || !isDayIndex(secondIndex) || firstIndex === secondIndex) return normalized
  const first = cloneDay(normalized[firstIndex])
  const second = cloneDay(normalized[secondIndex])
  normalized[firstIndex] = { ...second, weekday: first.weekday }
  normalized[secondIndex] = { ...first, weekday: second.weekday }
  return normalized
}

export function validateProgramEditor(input: ProgramEditorState): ProgramEditorValidation {
  const errors: ProgramEditorIssue[] = []
  if (!input.name.trim()) pushIssue(errors, { code: 'name_required', path: 'name' })
  if (!Array.isArray(input.days) || input.days.length !== 7) {
    pushIssue(errors, { code: 'invalid_day_count', path: 'days' })
  }
  input.days.slice(0, 7).forEach((day, dayIndex) => {
    if (!isRecord(day)) pushIssue(errors, { code: 'invalid_day', path: `days.${dayIndex}` })
    else if (day.exercises !== undefined && day.exercises !== null && !Array.isArray(day.exercises)) {
      pushIssue(errors, { code: 'invalid_exercise', path: `days.${dayIndex}.exercises` })
    }
  })
  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      name: input.name.trim(),
      description: input.description,
      source: input.source,
      days: normalizeProgramEditorDays(input.days).days,
    },
  }
}

export function prepareLegacyProgramPayload(input: {
  ownerUserId: string
  name: string
  description: string
  source: ProgramEditorSource
  days: readonly ProgramEditorDay[]
  now: () => Date
}): { ok: true; payload: LegacyProgramPayload } | { ok: false; errors: ProgramEditorIssue[] } {
  const validation = validateProgramEditor({
    name: input.name,
    description: input.description,
    source: input.source,
    days: cloneDays(input.days),
  })
  if (!validation.ok) return validation
  return {
    ok: true,
    payload: {
      user_id: input.ownerUserId,
      name: validation.value.name,
      description: validation.value.description,
      days: validation.value.days,
      source: validation.value.source,
      updated_at: input.now().toISOString(),
    },
  }
}

function createRestDay(weekday: string): ProgramEditorDay {
  return { name: '', weekday, is_rest: true, exercises: [] }
}

function cloneDays(days: readonly ProgramEditorDay[]): ProgramEditorDay[] {
  return normalizeProgramEditorDays(days).days
}

function cloneDay(day: ProgramEditorDay): ProgramEditorDay {
  return {
    ...cloneRecord(day),
    weekday: day.weekday,
    ...(day.exercises === undefined ? {} : { exercises: day.exercises === null ? null : day.exercises.map(cloneExercise) }),
  } as ProgramEditorDay
}

function cloneExercise(exercise: ProgramEditorExercise): ProgramEditorExercise {
  return cloneRecord(exercise) as ProgramEditorExercise
}

function cloneRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, cloneValue(value)]))
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue)
  if (isRecord(value)) return cloneRecord(value)
  return value
}

function hasExercise(days: readonly ProgramEditorDay[], position: ProgramExercisePosition): boolean {
  return isDayIndex(position.dayIndex)
    && Number.isInteger(position.exerciseIndex)
    && position.exerciseIndex >= 0
    && position.exerciseIndex < (days[position.dayIndex]?.exercises?.length ?? 0)
}

function exerciseList(day: ProgramEditorDay): ProgramEditorExercise[] {
  return Array.isArray(day.exercises) ? day.exercises : []
}

function isDayIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < 7
}

function pushIssue(issues: ProgramEditorIssue[], issue: ProgramEditorIssue): void {
  if (issues.length < MAX_VALIDATION_ERRORS) issues.push(issue)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
