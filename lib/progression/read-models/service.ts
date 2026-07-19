import {
  addCalendarDays,
  aggregateLegacyNutritionByDate,
  aggregateLegacyWaterByDate,
  calendarDateAt,
  groupLegacyWeeklyTonnage,
  sortWeights,
  sumLegacyWeeklyVolume,
  weightDelta,
} from '..'
import type {
  AnalyticsReadContext,
  AnalyticsReadModel,
  AnalyticsReadPort,
  AnalyticsReadResult,
  AnalyticsReadSource,
  ProgressionHistoryReadModel,
  ProgressionSummaryReadModel,
} from './types'

const EMPTY_MODEL: AnalyticsReadModel = {
  personalRecords: [], weeklyCalories: [], weeklyWater: [], weeklyVolume: [], weightHistoryFull: [],
}

export class LatestAnalyticsReadCoordinator {
  private sequence = 0
  private ownerUserId: string | null = null

  begin(ownerUserId: string): { readonly ownerUserId: string; readonly sequence: number } {
    this.ownerUserId = ownerUserId
    this.sequence += 1
    return { ownerUserId, sequence: this.sequence }
  }

  isCurrent(token: { readonly ownerUserId: string; readonly sequence: number }): boolean {
    return token.ownerUserId === this.ownerUserId && token.sequence === this.sequence
  }

  invalidate(): void {
    this.ownerUserId = null
    this.sequence += 1
  }
}

function emptyWith(model: Partial<AnalyticsReadModel>): AnalyticsReadModel {
  return { ...EMPTY_MODEL, ...model }
}

export function createAnalyticsReadModel(port: AnalyticsReadPort) {
  return {
    async load(context: AnalyticsReadContext): Promise<AnalyticsReadResult> {
      const today = calendarDateAt(context.clock.now(), context.timeZone)
      if (today.status !== 'complete') return { status: 'failure', data: null, sources: ['nutrition', 'water', 'weights', 'training_sets'] }
      const sevenDaysAgo = addCalendarDays(today.value, -7)
      const ninetyDaysAgo = addCalendarDays(today.value, -90)
      if (sevenDaysAgo.status !== 'complete' || ninetyDaysAgo.status !== 'complete') return { status: 'failure', data: null, sources: ['nutrition', 'water', 'weights'] }
      const fourWeeksAgo = new Date(context.clock.now().getTime() - 28 * 86_400_000).toISOString()

      const [records, nutrition, water, weights, sets] = await Promise.all([
        port.listPersonalRecords(context.ownerUserId, 50),
        port.listNutrition(context.ownerUserId, sevenDaysAgo.value, 100),
        port.listWater(context.ownerUserId, sevenDaysAgo.value, 30),
        port.listWeights(context.ownerUserId, ninetyDaysAgo.value, 100),
        port.listCompletedSets
          ? port.listCompletedSets(context.ownerUserId, fourWeeksAgo, 500)
          : Promise.resolve({ ok: true as const, data: [] }),
      ])
      const results = { records, nutrition, water, weights, training_sets: sets } as const
      const failedSources = (Object.entries(results) as [AnalyticsReadSource, typeof records][]).filter(([, result]) => !result.ok).map(([source]) => source)
      if (failedSources.length === 5) {
        const unavailable = Object.values(results).some(result => !result.ok && result.kind === 'unavailable')
        return unavailable
          ? { status: 'unavailable', data: EMPTY_MODEL, sources: [] }
          : { status: 'failure', data: null, sources: failedSources }
      }

      const sortedWeights = weights.ok ? sortWeights(weights.data) : null
      const weeklyVolume = sets.ok ? groupLegacyWeeklyTonnage({ sets: sets.data, timeZone: context.timeZone }) : null
      const validNutrition = nutrition.ok && nutrition.data.every(row => typeof row.date === 'string')
      const validWater = water.ok && water.data.every(row => typeof row.date === 'string')
      const data = emptyWith({
        personalRecords: records.ok ? [...records.data] : [],
        weeklyCalories: validNutrition ? aggregateLegacyNutritionByDate(nutrition.data as readonly (typeof nutrition.data[number] & { date: string })[]) : [],
        weeklyWater: validWater ? aggregateLegacyWaterByDate(water.data as readonly (typeof water.data[number] & { date: string })[]) : [],
        weightHistoryFull: sortedWeights?.status === 'complete' ? sortedWeights.value : [],
        weeklyVolume: weeklyVolume?.status === 'complete' ? weeklyVolume.value : [],
      })
      const derivedFailures: AnalyticsReadSource[] = []
      if (weights.ok && sortedWeights?.status === 'invalid') derivedFailures.push('weights')
      if (sets.ok && weeklyVolume?.status === 'invalid') derivedFailures.push('training_sets')
      if (nutrition.ok && !validNutrition) derivedFailures.push('nutrition')
      if (water.ok && !validWater) derivedFailures.push('water')
      const sources = [...new Set([...failedSources, ...derivedFailures])]
      const hasData = data.personalRecords.length + data.weeklyCalories.length + data.weeklyWater.length + data.weeklyVolume.length + data.weightHistoryFull.length > 0
      if (!sources.length && !hasData) return { status: 'unavailable', data, sources: [] }
      return sources.length ? { status: 'partial', data, sources } : { status: 'success', data, sources: [] }
    },
  }
}

export function buildProgressionSummaryReadModel(input: {
  readonly detailedSessionCount: number
  readonly personalRecordCount: number
  readonly streak: number
  readonly weeklyVolume: readonly { readonly volume: number }[]
  readonly weights: readonly { readonly date: string; readonly weight: number }[]
}): ProgressionSummaryReadModel {
  const delta = weightDelta(input.weights)
  return {
    detailedSessionCount: input.detailedSessionCount,
    personalRecordCount: input.personalRecordCount,
    streak: input.streak,
    totalWeeklyVolume: sumLegacyWeeklyVolume(input.weeklyVolume),
    weightDelta: delta.status === 'complete' ? delta.value.absolute : null,
  }
}

export function buildProgressionHistoryReadModel<TMeasurement extends { readonly date: string | null }, TSession, TCompletion, TScheduled>(input: {
  readonly weights: readonly { readonly date: string; readonly weight: number }[]
  readonly measurements: readonly TMeasurement[]
  readonly records: readonly import('./types').AnalyticsPersonalRecord[]
  readonly workoutSessions: readonly TSession[]
  readonly completionMarkers: readonly TCompletion[]
  readonly scheduledSessions: readonly TScheduled[]
}): ProgressionHistoryReadModel<TMeasurement, TSession, TCompletion, TScheduled> {
  const weights = sortWeights(input.weights)
  return {
    weights: weights.status === 'complete' ? weights.value : [],
    measurements: [...input.measurements].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
    records: [...input.records].sort((a, b) => (b.achieved_at ?? '').localeCompare(a.achieved_at ?? '') || a.exercise_name.localeCompare(b.exercise_name)),
    workoutSessions: [...input.workoutSessions],
    completionMarkers: [...input.completionMarkers],
    scheduledSessions: [...input.scheduledSessions],
  }
}
