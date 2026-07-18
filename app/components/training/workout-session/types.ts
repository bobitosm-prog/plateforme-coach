export type WorkoutTranslate = (key: string, values?: Record<string, string | number>) => string

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
