export const DESKTOP_NUTRITION_DAY_PROJECTION =
  'id,user_id,date,meal_type,custom_name,quantity_g,calories,protein,carbs,fat,created_at' as const

export type DesktopNutritionMetric = 'calories' | 'protein' | 'carbs' | 'fat'

export interface DesktopNutritionDayRow {
  readonly id?: unknown
  readonly user_id?: unknown
  readonly date?: unknown
  readonly meal_type?: unknown
  readonly custom_name?: unknown
  readonly quantity_g?: unknown
  readonly calories?: unknown
  readonly protein?: unknown
  readonly carbs?: unknown
  readonly fat?: unknown
  readonly created_at?: unknown
}

export interface DesktopNutritionDayTotals {
  readonly calories: number | null
  readonly proteins: number | null
  readonly carbs: number | null
  readonly fats: number | null
}

export interface DesktopNutritionDayIssue {
  readonly code: 'wrong_owner' | 'wrong_date' | 'unknown_metric' | 'invalid_metric'
  readonly path: string
  readonly metric?: DesktopNutritionMetric
}

export interface DesktopNutritionDayAggregation {
  readonly status: 'complete' | 'partial' | 'empty' | 'unavailable' | 'invalid'
  readonly totals: DesktopNutritionDayTotals
  readonly rows: readonly DesktopNutritionDayRow[]
  readonly issues: readonly DesktopNutritionDayIssue[]
}

type MetricRead =
  | { readonly status: 'known'; readonly value: number }
  | { readonly status: 'unknown' | 'invalid' }

interface MetricAccumulator {
  status: MetricRead['status']
  value: number
}

const METRICS = ['calories', 'protein', 'carbs', 'fat'] as const

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

function emptyAccumulators(): Record<DesktopNutritionMetric, MetricAccumulator> {
  return {
    calories: { status: 'known', value: 0 },
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

function unavailableTotals(): DesktopNutritionDayTotals {
  return { calories: null, proteins: null, carbs: null, fats: null }
}

export function sumDesktopNutritionMetric(
  rows: readonly DesktopNutritionDayRow[],
  metric: DesktopNutritionMetric,
): number | null {
  let total = 0
  for (const row of rows) {
    const read = readMetric(row[metric])
    if (read.status !== 'known') return null
    total += read.value
  }
  return total
}

export function presentDesktopNutritionMetric(value: unknown): string {
  const read = readMetric(value)
  return read.status === 'known' ? String(read.value) : '—'
}

export function aggregateDesktopNutritionDay(
  rows: readonly DesktopNutritionDayRow[],
  ownerUserId: string,
  selectedDate: string,
): DesktopNutritionDayAggregation {
  if (rows.length === 0) {
    return {
      status: 'empty',
      totals: { calories: 0, proteins: 0, carbs: 0, fats: 0 },
      rows: [],
      issues: [],
    }
  }

  const acceptedRows: DesktopNutritionDayRow[] = []
  const accumulators = emptyAccumulators()
  const issues: DesktopNutritionDayIssue[] = []

  for (const [rowIndex, row] of rows.entries()) {
    if (row.user_id !== ownerUserId) {
      issues.push({ code: 'wrong_owner', path: `rows.${rowIndex}.user_id` })
      continue
    }
    if (row.date !== selectedDate) {
      issues.push({ code: 'wrong_date', path: `rows.${rowIndex}.date` })
      continue
    }
    acceptedRows.push(row)
    for (const metric of METRICS) {
      const read = readMetric(row[metric])
      mergeMetric(accumulators[metric], read)
      if (read.status !== 'known') {
        issues.push({
          code: read.status === 'unknown' ? 'unknown_metric' : 'invalid_metric',
          path: `rows.${rowIndex}.${metric}`,
          metric,
        })
      }
    }
  }

  if (acceptedRows.length === 0) {
    return { status: 'invalid', totals: unavailableTotals(), rows: [], issues }
  }

  const totals = {
    calories: accumulators.calories.status === 'known'
      ? Math.round(accumulators.calories.value)
      : null,
    proteins: accumulators.protein.status === 'known'
      ? Math.round(accumulators.protein.value)
      : null,
    carbs: accumulators.carbs.status === 'known'
      ? Math.round(accumulators.carbs.value)
      : null,
    fats: accumulators.fat.status === 'known'
      ? Math.round(accumulators.fat.value)
      : null,
  }
  if (issues.length === 0) {
    return { status: 'complete', totals, rows: acceptedRows, issues }
  }
  if (Object.values(totals).some(value => value !== null)) {
    return { status: 'partial', totals, rows: acceptedRows, issues }
  }
  return {
    status: issues.some(issue => issue.code === 'wrong_owner' ||
      issue.code === 'wrong_date' ||
      issue.code === 'invalid_metric')
      ? 'invalid'
      : 'unavailable',
    totals,
    rows: acceptedRows,
    issues,
  }
}

export type DesktopNutritionDayReadResult =
  | { readonly status: 'ready'; readonly value: DesktopNutritionDayAggregation }
  | { readonly status: 'failure' }

export interface DesktopNutritionDayState {
  readonly status: 'loading' | 'ready' | 'failure'
  readonly value: DesktopNutritionDayAggregation | null
}

export function readDesktopNutritionDayResponse(
  data: readonly DesktopNutritionDayRow[] | null,
  error: unknown,
  ownerUserId: string,
  selectedDate: string,
): DesktopNutritionDayReadResult {
  return error === null || error === undefined
    ? {
      status: 'ready',
      value: aggregateDesktopNutritionDay(data ?? [], ownerUserId, selectedDate),
    }
    : { status: 'failure' }
}

export function settleDesktopNutritionDay(
  previous: DesktopNutritionDayState,
  result: DesktopNutritionDayReadResult,
  isCurrentRequest: boolean,
): DesktopNutritionDayState {
  if (!isCurrentRequest) return previous
  return result.status === 'ready'
    ? { status: 'ready', value: result.value }
    : { status: 'failure', value: previous.value }
}
