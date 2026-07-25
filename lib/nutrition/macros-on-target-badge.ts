export const MACROS_ON_TARGET_CALORIE_TOLERANCE = 0.1

export type MacrosOnTargetNotCalculableReason =
  | 'goal_absent'
  | 'goal_invalid'
  | 'consumption_unknown'
  | 'consumption_invalid'
  | 'owner_mismatch'

export type MacrosOnTargetCalculation =
  | {
      readonly status: 'calculable'
      readonly matchingDays: number
      readonly calorieGoal: number
    }
  | {
      readonly status: 'not_calculable'
      readonly reason: MacrosOnTargetNotCalculableReason
    }

export type MacrosOnTargetReadResult =
  | {
      readonly status: 'ready'
      readonly value: MacrosOnTargetCalculation
    }
  | {
      readonly status: 'failure'
      readonly source: 'profiles' | 'daily_food_logs'
      readonly error: unknown
    }
  | {
      readonly status: 'stale'
    }

interface MacrosOnTargetInput {
  readonly ownerUserId?: unknown
  readonly calorieGoal?: unknown
  readonly rows?: unknown
}

interface ReadResult {
  readonly data: unknown
  readonly error: unknown
}

interface MacrosOnTargetBadgeReaderDependencies {
  readonly readGoal: (ownerUserId: string) => Promise<ReadResult>
  readonly readLogs: (ownerUserId: string) => Promise<ReadResult>
}

interface MacrosOnTargetBadgeReader {
  read(ownerUserId: string): Promise<MacrosOnTargetReadResult>
}

interface SupabaseMacrosOnTargetClient {
  from(table: string): SupabaseMacrosOnTargetQuery
}

interface SupabaseMacrosOnTargetQuery extends PromiseLike<ReadResult> {
  select(projection: string): SupabaseMacrosOnTargetQuery
  eq(column: string, value: string): SupabaseMacrosOnTargetQuery
  single(): SupabaseMacrosOnTargetQuery
  order(
    column: string,
    options: { readonly ascending: boolean },
  ): SupabaseMacrosOnTargetQuery
  limit(value: number): SupabaseMacrosOnTargetQuery
}

type ParsedMetric =
  | { readonly status: 'known'; readonly value: number }
  | { readonly status: 'unknown' }
  | { readonly status: 'invalid' }

function parseNonNegativeMetric(value: unknown): ParsedMetric {
  if (value === null || value === undefined) return { status: 'unknown' }
  if (typeof value !== 'number' && typeof value !== 'string') return { status: 'invalid' }
  if (typeof value === 'string' && value.trim() === '') return { status: 'invalid' }
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return { status: 'invalid' }
  return { status: 'known', value: numeric }
}

function goalResult(value: unknown): ParsedMetric {
  const parsed = parseNonNegativeMetric(value)
  if (parsed.status !== 'known') return parsed
  return parsed.value > 0 ? parsed : { status: 'invalid' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function calculateMacrosOnTargetBadge(
  input: MacrosOnTargetInput,
): MacrosOnTargetCalculation {
  const goal = goalResult(input.calorieGoal)
  if (goal.status === 'unknown') {
    return { status: 'not_calculable', reason: 'goal_absent' }
  }
  if (goal.status === 'invalid') {
    return { status: 'not_calculable', reason: 'goal_invalid' }
  }

  if (!Array.isArray(input.rows)) {
    return { status: 'not_calculable', reason: 'consumption_invalid' }
  }

  const totalsByDate = new Map<string, number>()
  for (const candidate of input.rows) {
    if (!isRecord(candidate)) {
      return { status: 'not_calculable', reason: 'consumption_invalid' }
    }
    if (
      Object.prototype.hasOwnProperty.call(candidate, 'user_id')
      && candidate.user_id !== input.ownerUserId
    ) {
      return { status: 'not_calculable', reason: 'owner_mismatch' }
    }
    if (typeof candidate.date !== 'string' || candidate.date.trim() === '') {
      return { status: 'not_calculable', reason: 'consumption_invalid' }
    }
    const calories = parseNonNegativeMetric(candidate.calories)
    if (calories.status === 'unknown') {
      return { status: 'not_calculable', reason: 'consumption_unknown' }
    }
    if (calories.status === 'invalid') {
      return { status: 'not_calculable', reason: 'consumption_invalid' }
    }
    totalsByDate.set(
      candidate.date,
      (totalsByDate.get(candidate.date) ?? 0) + calories.value,
    )
  }

  let matchingDays = 0
  for (const calories of totalsByDate.values()) {
    if (
      Math.abs(calories - goal.value) / goal.value
      <= MACROS_ON_TARGET_CALORIE_TOLERANCE
    ) {
      matchingDays += 1
    }
  }
  return {
    status: 'calculable',
    matchingDays,
    calorieGoal: goal.value,
  }
}

export function createMacrosOnTargetBadgeReader(
  dependencies: MacrosOnTargetBadgeReaderDependencies,
): MacrosOnTargetBadgeReader {
  const requestByOwner = new Map<string, number>()

  return {
    async read(ownerUserId) {
      const request = (requestByOwner.get(ownerUserId) ?? 0) + 1
      requestByOwner.set(ownerUserId, request)
      const stale = () => requestByOwner.get(ownerUserId) !== request

      let goalRead: ReadResult
      try {
        goalRead = await dependencies.readGoal(ownerUserId)
      } catch (error) {
        if (stale()) return { status: 'stale' }
        return { status: 'failure', source: 'profiles', error }
      }
      if (stale()) return { status: 'stale' }
      if (goalRead.error) {
        return { status: 'failure', source: 'profiles', error: goalRead.error }
      }

      const profile = isRecord(goalRead.data) ? goalRead.data : null
      const calorieGoal = profile?.calorie_goal
      if (!calorieGoal) {
        return {
          status: 'ready',
          value: calculateMacrosOnTargetBadge({
            ownerUserId,
            calorieGoal,
            rows: [],
          }),
        }
      }

      let logsRead: ReadResult
      try {
        logsRead = await dependencies.readLogs(ownerUserId)
      } catch (error) {
        if (stale()) return { status: 'stale' }
        return { status: 'failure', source: 'daily_food_logs', error }
      }
      if (stale()) return { status: 'stale' }
      if (logsRead.error) {
        return {
          status: 'failure',
          source: 'daily_food_logs',
          error: logsRead.error,
        }
      }

      return {
        status: 'ready',
        value: calculateMacrosOnTargetBadge({
          ownerUserId,
          calorieGoal,
          rows: logsRead.data,
        }),
      }
    },
  }
}

const readerByClient = new WeakMap<object, MacrosOnTargetBadgeReader>()

export function getMacrosOnTargetBadgeReader(
  supabase: SupabaseMacrosOnTargetClient,
): MacrosOnTargetBadgeReader {
  const key = supabase as object
  const current = readerByClient.get(key)
  if (current) return current

  const reader = createMacrosOnTargetBadgeReader({
    readGoal: async ownerUserId => (
      await supabase
        .from('profiles')
        .select('calorie_goal')
        .eq('id', ownerUserId)
        .single()
    ),
    readLogs: async ownerUserId => (
      await supabase
        .from('daily_food_logs')
        .select('date, calories')
        .eq('user_id', ownerUserId)
        .order('date', { ascending: false })
        .limit(200)
    ),
  })
  readerByClient.set(key, reader)
  return reader
}
