export type LegacyFormatId =
  | 'coach-template-envelope-v1'
  | 'client-program-days-v1'
  | 'client-program-weekdays-fr-v1'
  | 'custom-program-days-v1'
  | 'moovx-xlsx-v1'
  | 'strong-hevy-csv-v1'
  | 'workout-history-v1'
  | 'completed-program-session-v1'
  | 'scheduled-session-v1'
  | 'ai-generated-program-v1'
  | 'personal-record-v1'

export const CORE_LEGACY_FORMATS = [
  'coach-template-envelope-v1',
  'client-program-days-v1',
  'client-program-weekdays-fr-v1',
  'custom-program-days-v1',
  'moovx-xlsx-v1',
  'strong-hevy-csv-v1',
  'workout-history-v1',
  'completed-program-session-v1',
] as const satisfies readonly LegacyFormatId[]

export type ProgramOwner =
  | { kind: 'platform'; platformId: 'moovx' }
  | { kind: 'coach'; coachId: string }
  | { kind: 'client'; clientId: string }

export type TrainingSource = {
  kind: 'manual' | 'catalog-template' | 'ai' | 'import' | 'legacy'
  createdBy: { kind: 'platform' | 'coach' | 'client' | 'system'; id?: string }
  provider?: string
  legacyFormat: LegacyFormatId
  createdAt: string
}

export type ExerciseReference =
  | { kind: 'catalog'; exerciseId: string; variantId?: string; snapshotName: string }
  | { kind: 'custom'; customExerciseId: string; ownerClientId: string; snapshotName: string }
  | { kind: 'legacy'; legacyName: string; legacySource: LegacyFormatId }

export type SetTarget =
  | { kind: 'repetitions'; min: number; max: number }
  | { kind: 'amrap'; minimum?: number }
  | { kind: 'duration'; minSeconds: number; maxSeconds?: number }
  | { kind: 'distance'; minMeters: number; maxMeters?: number }

export type RestPrescription =
  | { kind: 'fixed'; seconds: number }
  | { kind: 'range'; minSeconds: number; maxSeconds: number }
  | { kind: 'until-ready'; minimumSeconds?: number }
  | { kind: 'none' }

export type SetPrescription = {
  id: string
  index: number
  target: SetTarget
  load?:
    | { kind: 'absolute'; value: number; unit: 'kg' }
    | { kind: 'bodyweight'; adjustmentKg?: number }
    | { kind: 'open' }
  effort?: { kind: 'rir'; min: number; max: number } | { kind: 'rpe'; min: number; max: number }
  restAfter?: RestPrescription
  warmup: boolean
}

export type TrainingExercise = {
  id: string
  index: number
  exercise: ExerciseReference
  prescriptions: SetPrescription[]
  defaultRest: RestPrescription
  tempo?: string
  intensityTechnique?: { kind: string; details?: string }
  coachingNotes?: string
}

export type TrainingBlock = {
  id: string
  index: number
  kind: 'straight' | 'superset' | 'circuit' | 'interval'
  rounds: number
  exercises: TrainingExercise[]
}

export type TrainingSession = {
  id: string
  index: number
  name: string
  focusMuscles: string[]
  estimatedDurationSeconds?: number
  blocks: TrainingBlock[]
  notes?: string
}

export type TrainingDay =
  | { id: string; index: number; kind: 'rest'; label: string }
  | {
      id: string
      index: number
      kind: 'training'
      label: string
      preferredWeekday?: number
      sessions: TrainingSession[]
    }

export type TrainingWeek = {
  id: string
  index: number
  name?: string
  repeatCount: number
  days: TrainingDay[]
}

export type TrainingProgram = {
  id: string
  formatVersion: 1
  revision: number
  owner: ProgramOwner
  source: TrainingSource
  kind: 'template' | 'personal'
  name: string
  description?: string
  tags: string[]
  status: 'draft' | 'active' | 'archived'
  weeks: TrainingWeek[]
  createdAt: string
  updatedAt: string
}

export type AssignedProgram = {
  id: string
  formatVersion: 1
  clientId: string
  assignedBy: { kind: 'coach'; coachId: string } | { kind: 'client'; clientId: string } | { kind: 'system' }
  sourceProgramId: string
  sourceRevision: number
  programSnapshot: TrainingProgram
  status: 'scheduled' | 'active' | 'paused' | 'completed' | 'canceled' | 'superseded'
  startsOn?: string
  timezone: string
  createdAt: string
}

export type ExerciseCompletion = {
  id: string
  trainingExerciseId?: string
  exercise: ExerciseReference
  status: 'completed' | 'partial' | 'skipped'
  sets: Array<{
    id: string
    index: number
    status: 'completed' | 'skipped'
    repetitions?: number
    durationSeconds?: number
    distanceMeters?: number
    load?: { value: number; unit: 'kg' }
    rir?: number
    rpe?: number
  }>
  notes?: string
}

export type SessionExecution = {
  id: string
  formatVersion: 1
  clientId: string
  assignedProgramId?: string
  programId?: string
  programRevision?: number
  sessionId?: string
  legacyReference: LegacyReference
  status: 'planned' | 'in-progress' | 'completed' | 'abandoned'
  scheduledFor?: string
  startedAt?: string
  completedAt?: string
  durationSeconds?: number
  exercises: ExerciseCompletion[]
  notes?: string
}

export type PersonalRecord = {
  id: string
  clientId: string
  exercise: ExerciseReference
  kind: 'max-load' | 'max-repetitions' | 'estimated-1rm' | 'best-volume' | 'best-duration' | 'best-distance'
  value: number
  unit: 'kg' | 'repetitions' | 'kg-repetitions' | 'seconds' | 'meters'
  sessionExecutionId?: string
  achievedAt: string
  previousValue?: number
  legacyReference: LegacyReference
}

export type ScheduledTrainingSession = {
  id: string
  clientId: string
  coachId?: string
  scheduledFor: string
  timezone: string
  status: 'planned' | 'completed' | 'canceled' | 'unknown'
  sessionType?: string
  title: string
  durationSeconds?: number
  legacyReference: LegacyReference
}

export type LegacyCompletionMarker = {
  id: string
  clientId: string
  coachId?: string
  assignedProgramId?: string
  sessionIndex: number
  sessionName: string
  completedAt?: string
  durationSeconds?: number
  legacyReference: LegacyReference
}

export type LegacyReference = {
  format: LegacyFormatId
  sourceId?: string
  path?: string
}

export type AdapterWarning = {
  code:
    | 'ambiguous_field'
    | 'legacy_name_reference'
    | 'default_missing'
    | 'lossy_import'
    | 'unmapped_field'
    | 'unresolved_reference'
    | 'legacy_status'
  path: string
  detail: string
}

export type AdapterSuccess<T> = {
  status: 'converted'
  legacyFormat: LegacyFormatId
  value: T
  warnings: AdapterWarning[]
  unmappedFields: string[]
}

export type AdapterUnsupported = {
  status: 'legacyUnsupported'
  legacyFormat: LegacyFormatId
  reason: string
  legacyReference: LegacyReference
}

export type AdapterResult<T> = AdapterSuccess<T> | AdapterUnsupported

export type AdapterContext = {
  id: string
  now: string
  owner: ProgramOwner
  name?: string
  description?: string
  clientId?: string
  coachId?: string
  timezone?: string
  sourceId?: string
  sourceProgramId?: string
}
