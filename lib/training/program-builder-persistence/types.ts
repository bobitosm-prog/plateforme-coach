import type { ProgramEditorDay } from '../program-editor-model'

export type BuilderRecord = Record<string, unknown>

export interface ProgramBuilderPersistencePort {
  listCatalogExercises(): Promise<PortResult<BuilderRecord[]>>
  listCustomExercises(ownerUserId: string): Promise<PortResult<BuilderRecord[]>>
  findProfileGender(ownerUserId: string): Promise<PortResult<BuilderRecord | null>>
  createCustomExercise(payload: BuilderRecord): Promise<PortResult<BuilderRecord | null>>
  updateProgram(programId: string, payload: object): Promise<PortResult<null>>
  createProgram(payload: object): Promise<PortResult<null>>
  deletePendingSchedule(ownerUserId: string, from: string, to: string): Promise<PortResult<null>>
  createScheduledSessions(payload: BuilderRecord[]): Promise<PortResult<null>>
  findVariantGroup(exerciseName: string): Promise<PortResult<BuilderRecord | null>>
  listSimilarExercises(baseName: string, exerciseName: string): Promise<PortResult<BuilderRecord[]>>
  listVariantExercises(group: string, exerciseName: string): Promise<PortResult<BuilderRecord[]>>
}

export interface PortResult<T> {
  data: T
  error: unknown | null
}

export type BuilderFailureCode =
  | 'catalog_load_failed'
  | 'custom_exercises_load_failed'
  | 'profile_load_failed'
  | 'custom_exercise_save_failed'
  | 'program_save_failed'
  | 'calendar_delete_failed'
  | 'calendar_insert_failed'
  | 'variant_load_failed'

export interface BuilderFailure {
  code: BuilderFailureCode
}

export type BuilderLoadResult = {
  status: 'success' | 'partial' | 'failed'
  catalogExercises: BuilderRecord[]
  customExercises: BuilderRecord[]
  gender: string | null
  failures: BuilderFailure[]
}

export type BuilderSaveResult =
  | { status: 'success'; scheduledCount: number; failures: [] }
  | { status: 'save_failed'; scheduledCount: number; failures: BuilderFailure[] }
  | { status: 'calendar_failed'; scheduledCount: number; failures: BuilderFailure[] }
  | { status: 'partial'; scheduledCount: number; failures: BuilderFailure[] }

export interface SaveProgramInput {
  ownerUserId: string
  editProgramId?: string
  payload: object
  days: readonly ProgramEditorDay[]
  now: () => Date
}

export interface ScheduledSessionRecord extends BuilderRecord {
  user_id: string
  title: string
  session_type: 'custom'
  scheduled_date: string
  scheduled_time: '08:00'
  duration_min: 60
  completed: false
}
