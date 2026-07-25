export type NutritionTabMetric = 'kcal' | 'protein' | 'carbs' | 'fat'

export interface NutritionTabValues {
  readonly kcal: number | null
  readonly protein: number | null
  readonly carbs: number | null
  readonly fat: number | null
}

export interface NutritionTabLogRow {
  readonly user_id?: unknown
  readonly date?: unknown
  readonly calories?: unknown
  readonly protein?: unknown
  readonly carbs?: unknown
  readonly fat?: unknown
}

export interface NutritionTabGoalSource {
  readonly calorie_goal?: unknown
  readonly protein_goal?: unknown
  readonly carbs_goal?: unknown
  readonly fat_goal?: unknown
}

export interface NutritionTabIssue {
  readonly code:
    | 'wrong_owner'
    | 'wrong_date'
    | 'unknown_metric'
    | 'invalid_metric'
    | 'unknown_goal'
    | 'invalid_goal'
  readonly path: string
  readonly metric?: NutritionTabMetric
}

export interface NutritionTabConsumption {
  readonly status: 'complete' | 'partial' | 'empty' | 'unavailable' | 'invalid'
  readonly values: NutritionTabValues
  readonly issues: readonly NutritionTabIssue[]
  readonly acceptedRows: number
}

export interface NutritionTabGoals {
  readonly status: 'complete' | 'partial' | 'unavailable' | 'invalid'
  readonly values: NutritionTabValues
  readonly issues: readonly NutritionTabIssue[]
}

type MetricRead =
  | { readonly status: 'known'; readonly value: number }
  | { readonly status: 'unknown' | 'invalid' }

interface MetricAccumulator {
  status: MetricRead['status']
  value: number
}

const CONSUMPTION_FIELDS = {
  kcal: 'calories',
  protein: 'protein',
  carbs: 'carbs',
  fat: 'fat',
} as const

const GOAL_FIELDS = {
  kcal: 'calorie_goal',
  protein: 'protein_goal',
  carbs: 'carbs_goal',
  fat: 'fat_goal',
} as const

const METRICS = Object.keys(CONSUMPTION_FIELDS) as NutritionTabMetric[]

function readMetric(value: unknown): MetricRead {
  if (value === null || value === undefined) return { status: 'unknown' }
  if (typeof value === 'string') {
    if (value.trim() === '') return { status: 'unknown' }
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0
      ? { status: 'known', value: parsed }
      : { status: 'invalid' }
  }
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? { status: 'known', value }
    : { status: 'invalid' }
}

function emptyValues(value: number | null): NutritionTabValues {
  return { kcal: value, protein: value, carbs: value, fat: value }
}

function emptyAccumulators(): Record<NutritionTabMetric, MetricAccumulator> {
  return {
    kcal: { status: 'known', value: 0 },
    protein: { status: 'known', value: 0 },
    carbs: { status: 'known', value: 0 },
    fat: { status: 'known', value: 0 },
  }
}

function mergeMetric(accumulator: MetricAccumulator, read: MetricRead): void {
  if (read.status === 'known') {
    if (accumulator.status === 'known') accumulator.value += read.value
    return
  }
  if (read.status === 'invalid' || accumulator.status !== 'invalid') {
    accumulator.status = read.status
  }
}

export function aggregateNutritionTabConsumption(
  rows: readonly NutritionTabLogRow[],
  ownerUserId: string,
  selectedDate: string,
): NutritionTabConsumption {
  if (rows.length === 0) {
    return {
      status: 'empty',
      values: emptyValues(0),
      issues: [],
      acceptedRows: 0,
    }
  }

  const accumulators = emptyAccumulators()
  const issues: NutritionTabIssue[] = []
  let acceptedRows = 0

  for (const [rowIndex, row] of rows.entries()) {
    if (row.user_id !== ownerUserId) {
      issues.push({ code: 'wrong_owner', path: `rows.${rowIndex}.user_id` })
      continue
    }
    if (row.date !== selectedDate) {
      issues.push({ code: 'wrong_date', path: `rows.${rowIndex}.date` })
      continue
    }
    acceptedRows += 1
    for (const metric of METRICS) {
      const read = readMetric(row[CONSUMPTION_FIELDS[metric]])
      mergeMetric(accumulators[metric], read)
      if (read.status !== 'known') {
        issues.push({
          code: read.status === 'unknown' ? 'unknown_metric' : 'invalid_metric',
          path: `rows.${rowIndex}.${CONSUMPTION_FIELDS[metric]}`,
          metric,
        })
      }
    }
  }

  if (acceptedRows === 0) {
    return {
      status: 'invalid',
      values: emptyValues(null),
      issues,
      acceptedRows,
    }
  }

  const values = Object.fromEntries(METRICS.map(metric => [
    metric,
    accumulators[metric].status === 'known' ? accumulators[metric].value : null,
  ])) as unknown as NutritionTabValues
  if (issues.length === 0) return { status: 'complete', values, issues, acceptedRows }
  if (Object.values(values).some(value => value !== null)) {
    return { status: 'partial', values, issues, acceptedRows }
  }
  return {
    status: issues.some(issue => (
      issue.code === 'wrong_owner' ||
      issue.code === 'wrong_date' ||
      issue.code === 'invalid_metric'
    )) ? 'invalid' : 'unavailable',
    values,
    issues,
    acceptedRows,
  }
}

export function resolveNutritionTabGoals(
  source: NutritionTabGoalSource | null | undefined,
): NutritionTabGoals {
  const issues: NutritionTabIssue[] = []
  const values = Object.fromEntries(METRICS.map(metric => {
    const read = readMetric(source?.[GOAL_FIELDS[metric]])
    if (read.status !== 'known') {
      issues.push({
        code: read.status === 'unknown' ? 'unknown_goal' : 'invalid_goal',
        path: `profile.${GOAL_FIELDS[metric]}`,
        metric,
      })
    }
    return [metric, read.status === 'known' ? read.value : null]
  })) as unknown as NutritionTabValues
  if (issues.length === 0) return { status: 'complete', values, issues }
  if (Object.values(values).some(value => value !== null)) {
    return { status: 'partial', values, issues }
  }
  return {
    status: issues.some(issue => issue.code === 'invalid_goal')
      ? 'invalid'
      : 'unavailable',
    values,
    issues,
  }
}

export type NutritionTabJournalState = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export interface NutritionTabSummary {
  readonly consumption:
    | { readonly status: 'loading'; readonly value: null }
    | {
      readonly status: 'ready' | 'failure'
      readonly value: NutritionTabConsumption | null
    }
  readonly goals: NutritionTabGoals
}

export function readNutritionTabSummary(input: {
  readonly rows: readonly NutritionTabLogRow[]
  readonly journalState: NutritionTabJournalState
  readonly ownerUserId: string
  readonly selectedDate: string
  readonly profile: NutritionTabGoalSource | null | undefined
}): NutritionTabSummary {
  const aggregate = aggregateNutritionTabConsumption(
    input.rows,
    input.ownerUserId,
    input.selectedDate,
  )
  const goals = resolveNutritionTabGoals(input.profile)
  if (aggregate.acceptedRows > 0) {
    return {
      consumption: {
        status: input.journalState === 'error' ? 'failure' : 'ready',
        value: aggregate,
      },
      goals,
    }
  }
  if (input.rows.length > 0 && input.journalState !== 'loading') {
    return {
      consumption: {
        status: input.journalState === 'error' ? 'failure' : 'ready',
        value: input.journalState === 'error' ? null : aggregate,
      },
      goals,
    }
  }
  if (input.journalState === 'empty' || input.journalState === 'ready') {
    return {
      consumption: {
        status: 'ready',
        value: aggregateNutritionTabConsumption([], input.ownerUserId, input.selectedDate),
      },
      goals,
    }
  }
  if (input.journalState === 'error') {
    return { consumption: { status: 'failure', value: null }, goals }
  }
  return { consumption: { status: 'loading', value: null }, goals }
}

export function nutritionTabPercentage(
  value: number | null,
  target: number | null,
): number | null {
  return value !== null && target !== null && target > 0
    ? Math.min(100, Math.round(value / target * 100))
    : null
}

export function nutritionTabRemaining(
  consumed: number | null,
  target: number | null,
): number | null {
  return consumed !== null && target !== null
    ? Math.max(0, target - consumed)
    : null
}

export function sumNutritionTabMetric(
  rows: readonly NutritionTabLogRow[],
  field: 'calories' | 'protein' | 'carbs' | 'fat',
): number | null {
  let total = 0
  for (const row of rows) {
    const read = readMetric(row[field])
    if (read.status !== 'known') return null
    total += read.value
  }
  return total
}

export function presentNutritionTabMetric(
  value: unknown,
  options: { readonly rounded?: boolean } = {},
): string {
  const read = readMetric(value)
  if (read.status !== 'known') return '—'
  return String(options.rounded ? Math.round(read.value) : read.value)
}
