export type WorkoutTranslate = (key: string, values?: Record<string, string | number>) => string

export interface WorkoutSessionSet {
  id: string
  num: number
  weight: number | ''
  weightRaw: string
  reps: number | ''
  done: boolean
  rir: number | null
}

export interface WorkoutSessionExercise {
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
  sets: WorkoutSessionSet[]
  open: boolean
}

export interface WorkoutExerciseInfo {
  name: string
  muscle_group?: string | null
  equipment?: string | null
  difficulty?: string | null
  description?: string | null
  execution_tips?: string | null
  instructions?: string | null
  tips?: string | null
  gif_url?: string | null
  video_url?: string | null
  variant_group?: string | null
}

export interface WorkoutExerciseVariant {
  name: string
  equipment?: string | null
  muscle_group?: string | null
}

export interface WorkoutVariantPopupState {
  exIdx: number
  variants: WorkoutExerciseVariant[]
  originalName: string
}

export interface WorkoutTempoModalState { tempo: string; name: string }
export interface WorkoutTempoExecutorState extends WorkoutTempoModalState { exoId: string; setIdx: number; targetReps: number }

export interface WorkoutPresentationSet {
  id: string
  done: boolean
  weight: number | ''
  rir: number | null
}

export interface WorkoutPresentationExercise {
  name: string
  muscle: string
  sets: WorkoutPresentationSet[]
}

export interface WorkoutSummaryData {
  previousSessions: { id: string; name: string; date: string; volume: number }[]
  currentWeekVolume: number
  lastWeekVolume: number
}
