export const COACH_MEAL_ADHERENCE_EXPECTED_MEALS = 28

export type CoachMealAdherenceStatus =
  | 'known'
  | 'no_tracking'
  | 'invalid'
  | 'unavailable'
  | 'stale'

export interface CoachMealAdherence {
  readonly status: CoachMealAdherenceStatus
  readonly completedMeals: number | null
  readonly observedMeals: number | null
  readonly percentage: number | null
}

export type CoachMealTrackingRead =
  | { readonly status: 'success'; readonly rows: readonly unknown[] }
  | { readonly status: 'failure' }

const NO_TRACKING: CoachMealAdherence = {
  status: 'no_tracking',
  completedMeals: 0,
  observedMeals: 0,
  percentage: null,
}

const INVALID: CoachMealAdherence = {
  status: 'invalid',
  completedMeals: null,
  observedMeals: null,
  percentage: null,
}

const UNAVAILABLE: CoachMealAdherence = {
  status: 'unavailable',
  completedMeals: null,
  observedMeals: null,
  percentage: null,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSqlDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
}

export function calculateCoachMealAdherencePercentage(
  completedMeals: number,
  expectedMeals: number,
): number | null {
  if (
    !Number.isFinite(completedMeals) ||
    completedMeals < 0 ||
    !Number.isFinite(expectedMeals) ||
    expectedMeals <= 0
  ) {
    return null
  }
  return Math.round((completedMeals / expectedMeals) * 100)
}

export function settleCoachMealTrackingRead(
  data: unknown,
  error: unknown,
): CoachMealTrackingRead {
  if (error || !Array.isArray(data)) return { status: 'failure' }
  return { status: 'success', rows: data }
}

export function aggregateCoachMealAdherence(
  rows: readonly unknown[],
  scopedClientIds: readonly string[],
  fromDate: string,
): ReadonlyMap<string, CoachMealAdherence> {
  const scope = new Set(scopedClientIds)
  const counters = new Map<string, { completed: number; observed: number; invalid: boolean }>()
  for (const clientId of scope) {
    counters.set(clientId, { completed: 0, observed: 0, invalid: false })
  }

  for (const row of rows) {
    if (!isRecord(row) || typeof row.user_id !== 'string' || !scope.has(row.user_id)) {
      continue
    }
    const counter = counters.get(row.user_id)
    if (!counter) continue
    if (!isSqlDate(row.date)) {
      counter.invalid = true
      continue
    }
    if (row.date < fromDate) continue
    if (typeof row.is_completed !== 'boolean') {
      counter.invalid = true
      continue
    }
    counter.observed += 1
    if (row.is_completed) counter.completed += 1
  }

  return new Map([...counters].map(([clientId, counter]) => {
    if (counter.invalid) return [clientId, INVALID]
    if (counter.observed === 0) return [clientId, NO_TRACKING]
    return [clientId, {
      status: 'known',
      completedMeals: counter.completed,
      observedMeals: counter.observed,
      percentage: calculateCoachMealAdherencePercentage(
        counter.completed,
        COACH_MEAL_ADHERENCE_EXPECTED_MEALS,
      ),
    } satisfies CoachMealAdherence]
  }))
}

export function resolveCoachMealAdherenceRead(
  read: CoachMealTrackingRead,
  scopedClientIds: readonly string[],
  fromDate: string,
  previous?: ReadonlyMap<string, CoachMealAdherence>,
): {
  readonly status: 'confirmed' | 'failure'
  readonly values: ReadonlyMap<string, CoachMealAdherence>
} {
  if (read.status === 'success') {
    return {
      status: 'confirmed',
      values: aggregateCoachMealAdherence(read.rows, scopedClientIds, fromDate),
    }
  }
  return {
    status: 'failure',
    values: new Map(scopedClientIds.map(clientId => {
      const confirmed = previous?.get(clientId)
      return [clientId, confirmed
        ? { ...confirmed, status: 'stale' }
        : UNAVAILABLE]
    })),
  }
}

export function isCurrentCoachAnalyticsResponse(
  responseRequest: number,
  currentRequest: number,
  responseCoachId: string,
  currentCoachId: string | null,
): boolean {
  return responseRequest === currentRequest && responseCoachId === currentCoachId
}
