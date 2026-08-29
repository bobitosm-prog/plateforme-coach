import type { TrainingProgramSource } from './active-program'

export const ACTIVE_WORKOUT_DRAFT_VERSION = 2 as const
export const ACTIVE_WORKOUT_STORAGE_KEY = 'moovx_training_session_v2'
export const LEGACY_ACTIVE_WORKOUT_STORAGE_KEY = 'moovx_active_workout'
export const LEGACY_WORKOUT_DRAFT_STORAGE_KEY = 'moovx_workout_draft'
export const ACTIVE_WORKOUT_MAX_AGE_MS = 24 * 60 * 60 * 1000

export type ActiveWorkoutStatus = 'active' | 'saving' | 'save_error' | 'completed'

export interface WorkoutDraftSet {
  id: string
  num: number
  weight: number | ''
  weightRaw: string
  reps: number | ''
  done: boolean
  rir: number | null
}

export interface WorkoutDraftExercise {
  id: string
  name: string
  muscle: string
  targetSets: number
  targetReps: string
  rest: number
  tempo?: string
  rir?: number | null
  notes?: string
  videoUrl?: string
  imageUrl?: string
  technique?: string
  techniqueDetails?: string
  exerciseId?: string | null
  sets: WorkoutDraftSet[]
  open: boolean
}

export interface ActiveWorkoutDraft {
  version: typeof ACTIVE_WORKOUT_DRAFT_VERSION
  draftId: string
  userId: string
  programSource: TrainingProgramSource
  programId: string | null
  sessionKey: string
  sessionName: string
  /** Compatibility aliases consumed by the current shell until Wave 4C. */
  name: string
  trainingDay: string | null
  weekdayKey: string | null
  startedAt: string
  updatedAt: string
  currentExerciseIndex: number
  currentSetIndex: number
  exercises: WorkoutDraftExercise[]
  restTimerEndAt: string | null
  status: ActiveWorkoutStatus
  remoteSessionId: string | null
  errorCode?: string
}

export interface WorkoutDraftStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface CreateActiveWorkoutDraftInput {
  userId: string
  programSource: TrainingProgramSource
  programId: string | null
  sessionKey: string
  sessionName: string
  trainingDay?: string | null
  exercises: readonly unknown[]
  now?: Date
  draftId?: string
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function setId(): string {
  return `set_${createId()}`
}

function exerciseId(): string {
  return `exercise_${createId()}`
}

export function normalizeWorkoutDraftExercises(rows: readonly unknown[]): WorkoutDraftExercise[] {
  return rows.map((value) => {
    const row = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
    const targetSets = positiveInteger(row.targetSets ?? row.sets, 3)
    const existingSets = Array.isArray(row.sets) ? row.sets : null
    const sets = existingSets
      ? existingSets.map((setValue, index) => {
          const set = typeof setValue === 'object' && setValue !== null ? setValue as Record<string, unknown> : {}
          const weight: number | '' = typeof set.weight === 'number' && Number.isFinite(set.weight) ? set.weight : ''
          const reps: number | '' = typeof set.reps === 'number' && Number.isFinite(set.reps) ? set.reps : ''
          return {
            id: typeof set.id === 'string' ? set.id : setId(),
            num: positiveInteger(set.num, index + 1),
            weight,
            weightRaw: typeof set.weightRaw === 'string' ? set.weightRaw : weight === '' ? '' : String(weight).replace('.', ','),
            reps,
            done: set.done === true,
            rir: typeof set.rir === 'number' && Number.isFinite(set.rir) ? set.rir : null,
          }
        })
      : Array.from({ length: targetSets }, (_, index) => ({
          id: setId(),
          num: index + 1,
          weight: '' as const,
          weightRaw: '',
          reps: '' as const,
          done: false,
          rir: null,
        }))

    return {
      id: typeof row.id === 'string' ? row.id : exerciseId(),
      name: String(row.name ?? row.exercise_name ?? 'Exercice'),
      muscle: String(row.muscle ?? row.muscle_group ?? ''),
      targetSets,
      targetReps: String(row.targetReps ?? row.reps ?? '10-12'),
      rest: positiveInteger(row.rest ?? row.rest_seconds, 90),
      tempo: typeof row.tempo === 'string' ? row.tempo : undefined,
      rir: typeof row.rir === 'number' ? row.rir : null,
      notes: String(row.notes ?? row.description ?? row.tips ?? ''),
      videoUrl: typeof (row.videoUrl ?? row.video_url) === 'string' ? String(row.videoUrl ?? row.video_url) : undefined,
      imageUrl: typeof (row.imageUrl ?? row.image_url ?? row.gif_url) === 'string' ? String(row.imageUrl ?? row.image_url ?? row.gif_url) : undefined,
      technique: typeof row.technique === 'string' ? row.technique : undefined,
      techniqueDetails: typeof (row.techniqueDetails ?? row.technique_details) === 'string' ? String(row.techniqueDetails ?? row.technique_details) : undefined,
      exerciseId: typeof (row.exerciseId ?? row.exercise_id) === 'string' ? String(row.exerciseId ?? row.exercise_id) : null,
      sets,
      open: row.open !== false,
    }
  })
}

export function createActiveWorkoutDraft(input: CreateActiveWorkoutDraftInput): ActiveWorkoutDraft {
  const now = input.now ?? new Date()
  return {
    version: ACTIVE_WORKOUT_DRAFT_VERSION,
    draftId: input.draftId ?? createId(),
    userId: input.userId,
    programSource: input.programSource,
    programId: input.programId,
    sessionKey: input.sessionKey,
    sessionName: input.sessionName,
    name: input.sessionName,
    trainingDay: input.trainingDay ?? null,
    weekdayKey: input.trainingDay ?? null,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    exercises: normalizeWorkoutDraftExercises(input.exercises),
    restTimerEndAt: null,
    status: 'active',
    remoteSessionId: null,
  }
}

export function updateActiveWorkoutDraft(
  draft: ActiveWorkoutDraft,
  patch: Partial<Omit<ActiveWorkoutDraft, 'version' | 'draftId' | 'userId'>>,
  now = new Date(),
): ActiveWorkoutDraft {
  return { ...draft, ...patch, updatedAt: now.toISOString() }
}

export function findNextWorkoutPosition(
  exercises: readonly WorkoutDraftExercise[],
  currentExerciseIndex: number,
  currentSetIndex: number,
): { currentExerciseIndex: number; currentSetIndex: number } {
  const current = exercises[currentExerciseIndex]
  if (current) {
    const nextSet = current.sets.findIndex((set, index) => index > currentSetIndex && !set.done)
    if (nextSet >= 0) return { currentExerciseIndex, currentSetIndex: nextSet }
  }
  for (let exerciseIndex = currentExerciseIndex + 1; exerciseIndex < exercises.length; exerciseIndex += 1) {
    const nextSet = exercises[exerciseIndex].sets.findIndex(set => !set.done)
    if (nextSet >= 0) return { currentExerciseIndex: exerciseIndex, currentSetIndex: nextSet }
  }
  return { currentExerciseIndex, currentSetIndex }
}

function isDraft(value: unknown, userId: string, now: Date): value is ActiveWorkoutDraft {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  if (
    row.version !== ACTIVE_WORKOUT_DRAFT_VERSION
    || typeof row.draftId !== 'string'
    || row.userId !== userId
    || typeof row.updatedAt !== 'string'
    || !Array.isArray(row.exercises)
  ) return false
  const updatedAt = new Date(row.updatedAt).getTime()
  return Number.isFinite(updatedAt) && now.getTime() - updatedAt <= ACTIVE_WORKOUT_MAX_AGE_MS
}

function parseStorage(storage: WorkoutDraftStorage, key: string): unknown {
  const raw = storage.getItem(key)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function adaptLegacyDraft(storage: WorkoutDraftStorage, userId: string, now: Date): ActiveWorkoutDraft | null {
  const active = parseStorage(storage, LEGACY_ACTIVE_WORKOUT_STORAGE_KEY)
  const progress = parseStorage(storage, LEGACY_WORKOUT_DRAFT_STORAGE_KEY)
  const activeRow = typeof active === 'object' && active !== null ? active as Record<string, unknown> : null
  const progressRow = typeof progress === 'object' && progress !== null ? progress as Record<string, unknown> : null
  if (!activeRow && !progressRow) return null

  const sessionName = String(activeRow?.name ?? progressRow?.sessionName ?? 'Séance')
  const progressMatches = !progressRow?.sessionName || progressRow.sessionName === sessionName
  const exercises = progressMatches && Array.isArray(progressRow?.exos)
    ? progressRow.exos
    : Array.isArray(activeRow?.exercises) ? activeRow.exercises : []
  const startedAt = String(progressRow?.startedAt ?? activeRow?.startedAt ?? now.toISOString())
  const startedTime = new Date(startedAt).getTime()
  if (!Number.isFinite(startedTime) || now.getTime() - startedTime > ACTIVE_WORKOUT_MAX_AGE_MS) return null

  const draft = createActiveWorkoutDraft({
    userId,
    programSource: 'none',
    programId: null,
    sessionKey: String(activeRow?.weekdayKey ?? sessionName),
    sessionName,
    trainingDay: typeof activeRow?.weekdayKey === 'string' ? activeRow.weekdayKey : null,
    exercises,
    now: new Date(startedAt),
  })
  const adapted = updateActiveWorkoutDraft(draft, { exercises: normalizeWorkoutDraftExercises(exercises) }, now)
  writeActiveWorkoutDraft(storage, adapted)
  storage.removeItem(LEGACY_ACTIVE_WORKOUT_STORAGE_KEY)
  storage.removeItem(LEGACY_WORKOUT_DRAFT_STORAGE_KEY)
  return adapted
}

export function readActiveWorkoutDraft(
  storage: WorkoutDraftStorage,
  userId: string,
  now = new Date(),
): ActiveWorkoutDraft | null {
  const parsed = parseStorage(storage, ACTIVE_WORKOUT_STORAGE_KEY)
  if (isDraft(parsed, userId, now)) {
    // A request cannot still be in flight after a reload. Preserve the draft and
    // expose an explicit retry state instead of leaving the UI stuck on saving.
    if (parsed.status === 'saving') {
      const interrupted = updateActiveWorkoutDraft(parsed, {
        status: 'save_error',
        errorCode: 'WORKOUT_SAVE_INTERRUPTED',
      }, now)
      writeActiveWorkoutDraft(storage, interrupted)
      return interrupted
    }
    return parsed
  }
  if (parsed !== null) storage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
  return adaptLegacyDraft(storage, userId, now)
}

export function writeActiveWorkoutDraft(storage: WorkoutDraftStorage, draft: ActiveWorkoutDraft): void {
  storage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(draft))
}

export function removeActiveWorkoutDraft(storage: WorkoutDraftStorage, draftId?: string): boolean {
  if (draftId) {
    const current = parseStorage(storage, ACTIVE_WORKOUT_STORAGE_KEY)
    if (typeof current !== 'object' || current === null || (current as Record<string, unknown>).draftId !== draftId) return false
  }
  storage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
  storage.removeItem(LEGACY_ACTIVE_WORKOUT_STORAGE_KEY)
  storage.removeItem(LEGACY_WORKOUT_DRAFT_STORAGE_KEY)
  return true
}
