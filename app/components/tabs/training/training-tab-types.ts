import type { MutableRefObject } from 'react'
import type { ImportResult } from '../../../../lib/program-excel'
import type { ScheduledSession } from '../../../../lib/schedule-utils'
import type { LegacyWorkoutSession, WorkoutExerciseDetail } from '../../../../lib/training/session-history'
import type { TrainingExerciseVariant } from './modals/TrainingVariantModal'

export interface LegacyTrainingExercise {
  id?: string
  name?: string
  exercise_name?: string
  custom_name?: string
  muscle_group?: string
  sets?: number | string
  reps?: number | string
  rest_seconds?: number | string
  weight?: number | string
  tempo?: string
  technique?: string
  technique_details?: string
  gif_url?: string | null
  video_url?: string | null
  equipment?: string | null
  isAdded?: boolean
  [key: string]: unknown
}

export interface LegacyTrainingDay {
  name?: string
  weekday?: string
  day_name?: string
  is_rest?: boolean
  repos?: boolean
  exercises?: LegacyTrainingExercise[]
  [key: string]: unknown
}

export interface LegacyTrainingProgram {
  id: string
  name: string
  description?: string
  user_id?: string
  days?: LegacyTrainingDay[]
  is_active?: boolean
  scheduled?: boolean
  start_date?: string | null
  total_weeks?: number | null
  current_week?: number | null
  phases?: unknown
  source?: string | null
  updated_at?: string
  [key: string]: unknown
}

export interface TrainingTabPublicProps {
  supabase: unknown
  session: { user?: { id?: string } } | null
  profile?: { subscription_type?: string; current_weight?: number } | null
  coachProgram: Record<string, LegacyTrainingDay> | null
  todayKey: string
  todaySessionDone: boolean
  startProgramWorkout: (day: LegacyTrainingDay, exercises: LegacyTrainingExercise[], weekdayKey?: string) => void
  fetchAll: () => Promise<void>
  scheduledSessions: ScheduledSession[]
  calendarSelectedDate: Date
  setCalendarSelectedDate: (date: Date) => void
  markSessionCompleted: (id: string) => Promise<void>
  checkForPR: (exerciseName: string, weight: number, reps: number) => Promise<{ newPR: boolean; exercise?: string; value?: number; previous?: number }>
  lastCompletedByIndex?: Map<number, string>
  setModal: (modal: string | null) => void
}

export interface TrainingProgramUiState {
  programs: LegacyTrainingProgram[]
  activeProgram: LegacyTrainingProgram | null
  showManager: boolean
  expandedProgramId: string | null
  confirmDeleteId: string | null
  showBuilder: boolean
  editingProgram: LegacyTrainingProgram | null
  editedDays: LegacyTrainingDay[] | null
  editMode: boolean
  variantPopup: { dayIdx: number; exIdx: number; variants: TrainingExerciseVariant[] } | null
  importPreview: ImportResult['program'] | null
  importSkipped: string[]
  importName: string
  importFileRef: MutableRefObject<HTMLInputElement | null>
  startModalProgram: LegacyTrainingProgram | { name: string } | null
  startModalImportData: Record<string, unknown> | null
}

export interface TrainingWorkoutUiState {
  history: LegacyWorkoutSession[]
  selectedWorkout: LegacyWorkoutSession | null
  detail: WorkoutExerciseDetail[]
  loadingDetail: boolean
}
