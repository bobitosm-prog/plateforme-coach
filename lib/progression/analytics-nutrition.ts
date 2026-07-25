export type AnalyticsNutritionMetric = 'calories' | 'protein' | 'carbs' | 'fat'

export interface AnalyticsNutritionRow {
  readonly date: unknown
  readonly calories?: unknown
  readonly protein?: unknown
  readonly carbs?: unknown
  readonly fat?: unknown
}

export interface AnalyticsNutritionDay {
  readonly date: string
  readonly calories: number | null
  readonly protein: number | null
  readonly carbs: number | null
  readonly fat: number | null
}

export interface AnalyticsNutritionIssue {
  readonly code: 'invalid_date' | 'unknown_metric' | 'invalid_metric'
  readonly path: string
  readonly date?: string
  readonly metric?: AnalyticsNutritionMetric
}

export interface AnalyticsNutritionAggregation {
  readonly status: 'complete' | 'partial' | 'unavailable' | 'invalid'
  readonly days: readonly AnalyticsNutritionDay[]
  readonly issues: readonly AnalyticsNutritionIssue[]
}

type MetricRead =
  | { readonly status: 'known'; readonly value: number }
  | { readonly status: 'unknown' }
  | { readonly status: 'invalid' }

interface MetricAccumulator {
  status: 'known' | 'unknown' | 'invalid'
  value: number
}

const METRICS = ['calories', 'protein', 'carbs', 'fat'] as const

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const instant = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 10) === value
}

export function readAnalyticsNutritionMetric(value: unknown): MetricRead {
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

function emptyMetrics(): Record<AnalyticsNutritionMetric, MetricAccumulator> {
  return {
    calories: { status: 'known', value: 0 },
    protein: { status: 'known', value: 0 },
    carbs: { status: 'known', value: 0 },
    fat: { status: 'known', value: 0 },
  }
}

export function aggregateAnalyticsNutritionByDate(
  rows: readonly AnalyticsNutritionRow[],
): AnalyticsNutritionAggregation {
  if (rows.length === 0) return { status: 'unavailable', days: [], issues: [] }

  const groups = new Map<string, Record<AnalyticsNutritionMetric, MetricAccumulator>>()
  const issues: AnalyticsNutritionIssue[] = []

  rows.forEach((row, rowIndex) => {
    if (!validDate(row.date)) {
      issues.push({ code: 'invalid_date', path: `rows.${rowIndex}.date` })
      return
    }
    const metrics = groups.get(row.date) ?? emptyMetrics()
    groups.set(row.date, metrics)

    for (const metric of METRICS) {
      const read = readAnalyticsNutritionMetric(row[metric])
      if (read.status === 'known') {
        if (metrics[metric].status === 'known') metrics[metric].value += read.value
        continue
      }
      if (read.status === 'invalid' || metrics[metric].status !== 'invalid') {
        metrics[metric].status = read.status
      }
      issues.push({
        code: read.status === 'unknown' ? 'unknown_metric' : 'invalid_metric',
        path: `rows.${rowIndex}.${metric}`,
        date: row.date,
        metric,
      })
    }
  })

  const days = [...groups]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, metrics]) => ({
      date,
      calories: metrics.calories.status === 'known' ? metrics.calories.value : null,
      protein: metrics.protein.status === 'known' ? metrics.protein.value : null,
      carbs: metrics.carbs.status === 'known' ? metrics.carbs.value : null,
      fat: metrics.fat.status === 'known' ? metrics.fat.value : null,
    }))

  const knownMetricCount = days.reduce(
    (count, day) => count + METRICS.filter(metric => day[metric] !== null).length,
    0,
  )
  if (issues.length === 0) return { status: 'complete', days, issues }
  if (knownMetricCount > 0) return { status: 'partial', days, issues }
  return {
    status: issues.some(issue => issue.code === 'invalid_date' || issue.code === 'invalid_metric')
      ? 'invalid'
      : 'unavailable',
    days,
    issues,
  }
}

export type AnalyticsNutritionSettlement =
  | { readonly status: 'ready'; readonly days: readonly AnalyticsNutritionDay[] }
  | { readonly status: 'failure' }

export function settleAnalyticsNutritionDays(
  previous: readonly AnalyticsNutritionDay[],
  result: AnalyticsNutritionSettlement,
  isCurrentRequest: boolean,
): readonly AnalyticsNutritionDay[] {
  if (!isCurrentRequest || result.status === 'failure') return previous
  return result.days
}
