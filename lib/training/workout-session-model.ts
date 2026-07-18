export interface WorkoutClock {
  now(): Date
}

export type WorkoutSessionSource =
  | { kind: 'free' }
  | { kind: 'scheduled'; weekdayKey: string }

export interface WorkoutSessionSet {
  id: string
  index: number
  weight: number | null
  repetitions: number | null
  completed: boolean
  rir: number | null
}

export interface WorkoutSessionExercise {
  id: string
  index: number
  name: string
  muscle: string | null
  exerciseId: string | null
  targetSets: number
  targetRepetitions: string
  restSeconds: number
  sets: WorkoutSessionSet[]
  legacy: Readonly<Record<string, unknown>> | null
}

export interface WorkoutSessionData {
  name: string
  source: WorkoutSessionSource
  startedAt: string
  exercises: WorkoutSessionExercise[]
}

export type WorkoutSessionState =
  | { phase: 'prepared'; session: WorkoutSessionData }
  | { phase: 'in-progress'; session: WorkoutSessionData }
  | { phase: 'resting'; session: WorkoutSessionData; rest: WorkoutRestPeriod }
  | { phase: 'rest-complete'; session: WorkoutSessionData; rest: WorkoutRestPeriod; completedAt: string }
  | { phase: 'abandoned'; session: WorkoutSessionData; abandonedAt: string }

export interface WorkoutRestPeriod {
  exerciseId: string
  setId: string
  durationSeconds: number
  startedAt: string
  endsAt: string
}

export type WorkoutTransitionReason =
  | 'invalid_phase'
  | 'exercise_not_found'
  | 'set_not_found'
  | 'invalid_duration'
  | 'invalid_input'

export type WorkoutTransitionResult =
  | { ok: true; state: WorkoutSessionState }
  | { ok: false; state: WorkoutSessionState; reason: WorkoutTransitionReason }

export interface WorkoutFinalizationSnapshot {
  durationMs: number
  completedSets: number
  totalSets: number
  totalVolume: number
  exercises: Array<{
    name: string
    muscle: string | null
    exerciseId: string | null
    setsTarget: number
    sets: Array<{ weight: number; reps: number; rir: number | null }>
  }>
}

export type LegacyWorkoutExerciseResult =
  | { kind: 'supported'; exercise: WorkoutSessionExercise; warnings: string[] }
  | { kind: 'unsupported'; input: unknown; reason: 'not_an_object' | 'missing_name' }

type IdFactory = (kind: 'exercise' | 'set', exerciseIndex: number, setIndex?: number) => string

const defaultIdFactory: IdFactory = (kind, exerciseIndex, setIndex) =>
  kind === 'exercise' ? `exercise-${exerciseIndex}` : `exercise-${exerciseIndex}-set-${setIndex}`

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null

const positiveInteger = (value: unknown, fallback: number): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const optionalNumber = (value: unknown): number | null => {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function adaptLegacyWorkoutExercise(
  input: unknown,
  exerciseIndex: number,
  idFactory: IdFactory = defaultIdFactory,
): LegacyWorkoutExerciseResult {
  const legacy = recordOf(input)
  if (!legacy) return { kind: 'unsupported', input, reason: 'not_an_object' }
  const rawName = legacy.exercise_name ?? legacy.name
  if (typeof rawName !== 'string' || rawName.trim() === '') {
    return { kind: 'unsupported', input, reason: 'missing_name' }
  }
  const warnings: string[] = []
  const targetSets = positiveInteger(legacy.sets, 3)
  if (legacy.sets !== undefined && Number(legacy.sets) !== targetSets) warnings.push('invalid_sets_defaulted')
  const rawSets = Array.isArray(legacy.sessionSets) ? legacy.sessionSets : null
  const sets = Array.from({ length: rawSets?.length || targetSets }, (_, setIndex) => {
    const row = recordOf(rawSets?.[setIndex]) ?? {}
    return {
      id: typeof row.id === 'string' ? row.id : idFactory('set', exerciseIndex, setIndex),
      index: setIndex,
      weight: optionalNumber(row.weight),
      repetitions: optionalNumber(row.reps),
      completed: row.done === true,
      rir: optionalNumber(row.rir),
    }
  })
  return {
    kind: 'supported', warnings,
    exercise: {
      id: typeof legacy.id === 'string' ? legacy.id : idFactory('exercise', exerciseIndex),
      index: exerciseIndex,
      name: rawName,
      muscle: typeof (legacy.muscle_group ?? legacy.muscle) === 'string' ? String(legacy.muscle_group ?? legacy.muscle) : null,
      exerciseId: typeof legacy.exercise_id === 'string' ? legacy.exercise_id : null,
      targetSets,
      targetRepetitions: String(legacy.reps ?? '10-12'),
      restSeconds: positiveInteger(legacy.rest_seconds ?? legacy.rest, 90),
      sets,
      legacy: { ...legacy },
    },
  }
}

export function createWorkoutSession(
  input: { name: string; source: WorkoutSessionSource; exercises: WorkoutSessionExercise[] },
  clock: WorkoutClock,
): WorkoutTransitionResult | { ok: false; reason: 'invalid_input' } {
  if (!input.name.trim() || !Array.isArray(input.exercises)) return { ok: false, reason: 'invalid_input' }
  return {
    ok: true,
    state: {
      phase: 'prepared',
      session: {
        name: input.name,
        source: { ...input.source },
        startedAt: clock.now().toISOString(),
        exercises: input.exercises.map(cloneExercise),
      },
    },
  }
}

export function createLegacyWorkoutLaunch(
  input: { name: string; exercises: unknown[]; weekdayKey?: string },
  clock: WorkoutClock,
): { name: string; exercises: unknown[]; startedAt: string; weekdayKey?: string } {
  return {
    name: input.name,
    exercises: input.exercises,
    startedAt: clock.now().toISOString(),
    ...(input.weekdayKey === undefined ? {} : { weekdayKey: input.weekdayKey }),
  }
}

export function startWorkout(state: WorkoutSessionState): WorkoutTransitionResult {
  if (state.phase !== 'prepared') return refused(state, 'invalid_phase')
  return accepted({ phase: 'in-progress', session: cloneSession(state.session) })
}

export function updateWorkoutSet(
  state: WorkoutSessionState,
  exerciseId: string,
  setId: string,
  patch: Partial<Pick<WorkoutSessionSet, 'weight' | 'repetitions' | 'completed' | 'rir'>>,
): WorkoutTransitionResult {
  if (!isEditable(state)) return refused(state, 'invalid_phase')
  const exercise = state.session.exercises.find(item => item.id === exerciseId)
  if (!exercise) return refused(state, 'exercise_not_found')
  if (!exercise.sets.some(item => item.id === setId)) return refused(state, 'set_not_found')
  const session = cloneSession(state.session)
  const target = session.exercises.find(item => item.id === exerciseId)!
  target.sets = target.sets.map(set => set.id === setId ? { ...set, ...patch } : set)
  return accepted(withSession(state, session))
}

export function addWorkoutExercise(state: WorkoutSessionState, exercise: WorkoutSessionExercise): WorkoutTransitionResult {
  if (!isEditable(state)) return refused(state, 'invalid_phase')
  const session = cloneSession(state.session)
  session.exercises = [...session.exercises, { ...cloneExercise(exercise), index: session.exercises.length }]
  return accepted(withSession(state, session))
}

export function removeWorkoutExercise(state: WorkoutSessionState, exerciseId: string): WorkoutTransitionResult {
  if (!isEditable(state)) return refused(state, 'invalid_phase')
  if (!state.session.exercises.some(item => item.id === exerciseId)) return refused(state, 'exercise_not_found')
  const session = cloneSession(state.session)
  session.exercises = session.exercises.filter(item => item.id !== exerciseId).map((item, index) => ({ ...item, index }))
  return accepted(withSession(state, session))
}

export function startWorkoutRest(
  state: WorkoutSessionState,
  input: { exerciseId: string; setId: string; durationSeconds: number },
  clock: WorkoutClock,
): WorkoutTransitionResult {
  if (state.phase !== 'in-progress' && state.phase !== 'rest-complete') return refused(state, 'invalid_phase')
  const exercise = state.session.exercises.find(item => item.id === input.exerciseId)
  if (!exercise) return refused(state, 'exercise_not_found')
  if (!exercise.sets.some(item => item.id === input.setId)) return refused(state, 'set_not_found')
  const period = createWorkoutRestPeriod(input, clock)
  if (!period.ok) return refused(state, period.reason)
  return accepted({
    phase: 'resting', session: cloneSession(state.session),
    rest: period.rest,
  })
}

export function createWorkoutRestPeriod(
  input: { exerciseId: string; setId: string; durationSeconds: number },
  clock: WorkoutClock,
): { ok: true; rest: WorkoutRestPeriod } | { ok: false; reason: 'invalid_duration' } {
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) return { ok: false, reason: 'invalid_duration' }
  const startedAt = clock.now()
  const durationSeconds = input.durationSeconds
  return {
    ok: true,
    rest: {
      ...input, durationSeconds,
      startedAt: startedAt.toISOString(),
      endsAt: new Date(startedAt.getTime() + durationSeconds * 1_000).toISOString(),
    },
  }
}

export function finishWorkoutRest(state: WorkoutSessionState, clock: WorkoutClock): WorkoutTransitionResult {
  if (state.phase !== 'resting') return refused(state, 'invalid_phase')
  return accepted({ phase: 'rest-complete', session: cloneSession(state.session), rest: { ...state.rest }, completedAt: clock.now().toISOString() })
}

export function cancelWorkoutRest(state: WorkoutSessionState): WorkoutTransitionResult {
  if (state.phase !== 'resting' && state.phase !== 'rest-complete') return refused(state, 'invalid_phase')
  return accepted({ phase: 'in-progress', session: cloneSession(state.session) })
}

export function abandonWorkout(state: WorkoutSessionState, clock: WorkoutClock): WorkoutTransitionResult {
  if (state.phase === 'abandoned') return refused(state, 'invalid_phase')
  return accepted({ phase: 'abandoned', session: cloneSession(state.session), abandonedAt: clock.now().toISOString() })
}

export function prepareWorkoutFinalization(
  state: WorkoutSessionState,
  durationMs: number,
): { ok: true; snapshot: WorkoutFinalizationSnapshot } | { ok: false; reason: WorkoutTransitionReason } {
  if (!isEditable(state)) return { ok: false, reason: 'invalid_phase' }
  if (!Number.isFinite(durationMs) || durationMs < 0) return { ok: false, reason: 'invalid_input' }
  const exercises = state.session.exercises.map(exercise => ({
    name: exercise.name,
    muscle: exercise.muscle,
    exerciseId: exercise.exerciseId,
    setsTarget: exercise.targetSets,
    sets: exercise.sets.filter(set => set.completed).map(set => ({
      weight: set.weight ?? 0,
      reps: set.repetitions ?? 0,
      rir: set.rir,
    })),
  }))
  const completedSets = exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
  const totalSets = state.session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
  const totalVolume = exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + set.weight * set.reps, 0), 0)
  return { ok: true, snapshot: { durationMs, completedSets, totalSets, totalVolume, exercises } }
}

function isEditable(state: WorkoutSessionState): boolean {
  return state.phase === 'in-progress' || state.phase === 'resting' || state.phase === 'rest-complete'
}

function accepted(state: WorkoutSessionState): WorkoutTransitionResult {
  return { ok: true, state }
}

function refused(state: WorkoutSessionState, reason: WorkoutTransitionReason): WorkoutTransitionResult {
  return { ok: false, state, reason }
}

function cloneExercise(exercise: WorkoutSessionExercise): WorkoutSessionExercise {
  return { ...exercise, sets: exercise.sets.map(set => ({ ...set })), legacy: exercise.legacy ? { ...exercise.legacy } : null }
}

function cloneSession(session: WorkoutSessionData): WorkoutSessionData {
  return { ...session, source: { ...session.source }, exercises: session.exercises.map(cloneExercise) }
}

function withSession(state: WorkoutSessionState, session: WorkoutSessionData): WorkoutSessionState {
  if (state.phase === 'resting') return { ...state, session, rest: { ...state.rest } }
  if (state.phase === 'rest-complete') return { ...state, session, rest: { ...state.rest } }
  if (state.phase === 'abandoned') return { ...state, session }
  return { ...state, session }
}
