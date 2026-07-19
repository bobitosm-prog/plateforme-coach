import type { DatedTrainingSet, DatedWeight, ProgressionClock } from '..'

export type ProgressionReadFailureKind = 'unauthorized' | 'unavailable' | 'failure'

export type ProgressionPortResult<T> =
  | { readonly ok: true; readonly data: readonly T[] }
  | { readonly ok: false; readonly kind: ProgressionReadFailureKind }

export interface AnalyticsPersonalRecord {
  readonly id: string
  readonly user_id: string
  readonly exercise_name: string
  readonly record_type: string
  readonly value: number
  readonly previous_value: number | null
  readonly unit: string | null
  readonly achieved_at: string | null
  readonly created_at: string | null
}

export interface AnalyticsReadPort {
  listPersonalRecords(ownerUserId: string, limit: 50): Promise<ProgressionPortResult<AnalyticsPersonalRecord>>
  listNutrition(ownerUserId: string, fromDate: string, limit: 100): Promise<ProgressionPortResult<{
    readonly date: string | null; readonly calories: number | null; readonly protein: number | null; readonly carbs: number | null; readonly fat: number | null
  }>>
  listWater(ownerUserId: string, fromDate: string, limit: 30): Promise<ProgressionPortResult<{ readonly date: string | null; readonly milliliters: number | null }>>
  listWeights(ownerUserId: string, fromDate: string, limit: 100): Promise<ProgressionPortResult<DatedWeight>>
  listCompletedSets?(ownerUserId: string, fromInstant: string, limit: 500): Promise<ProgressionPortResult<DatedTrainingSet>>
}

export interface AnalyticsReadContext {
  readonly ownerUserId: string
  readonly clock: ProgressionClock
  readonly timeZone: string
}

export interface AnalyticsReadModel {
  readonly personalRecords: readonly AnalyticsPersonalRecord[]
  readonly weeklyCalories: readonly { date: string; calories: number; protein: number; carbs: number; fat: number }[]
  readonly weeklyWater: readonly { date: string; ml: number }[]
  readonly weeklyVolume: readonly { week: string; volume: number }[]
  readonly weightHistoryFull: readonly DatedWeight[]
}

export type AnalyticsReadResult =
  | { readonly status: 'success'; readonly data: AnalyticsReadModel; readonly sources: readonly [] }
  | { readonly status: 'partial'; readonly data: AnalyticsReadModel; readonly sources: readonly AnalyticsReadSource[] }
  | { readonly status: 'unavailable'; readonly data: AnalyticsReadModel; readonly sources: readonly [] }
  | { readonly status: 'failure'; readonly data: null; readonly sources: readonly AnalyticsReadSource[] }

export type AnalyticsReadSource = 'records' | 'nutrition' | 'water' | 'weights' | 'training_sets'

export interface ProgressionSummaryReadModel {
  readonly detailedSessionCount: number
  readonly personalRecordCount: number
  readonly streak: number
  readonly totalWeeklyVolume: number
  readonly weightDelta: number | null
}

export interface ProgressionHistoryReadModel<TMeasurement, TSession, TCompletion, TScheduled> {
  readonly weights: readonly DatedWeight[]
  readonly measurements: readonly TMeasurement[]
  readonly records: readonly AnalyticsPersonalRecord[]
  readonly workoutSessions: readonly TSession[]
  readonly completionMarkers: readonly TCompletion[]
  readonly scheduledSessions: readonly TScheduled[]
}
