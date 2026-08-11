import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '../supabase/types.ts'

import {
  readNutritionTabSummary,
  type NutritionTabGoalSource,
  type NutritionTabSummary,
} from './nutrition-tab-summary.ts'

export const NUTRITION_JOURNAL_PROJECTION =
  'id,user_id,date,meal_type,food_id,custom_name,quantity_g,calories,protein,carbs,fat,created_at' as const

export type NutritionJournalRow = Pick<Tables<'daily_food_logs'>,
  'id' | 'user_id' | 'date' | 'meal_type' | 'food_id' | 'custom_name' | 'quantity_g' | 'calories' |
  'protein' | 'carbs' | 'fat' | 'created_at'>

export interface NutritionJournalReadMetrics {
  readonly correlation_id: string | null
  readonly total_ms: number
  readonly journal_ms: number
  readonly calendar_ms: number
  readonly water_ms: number
  readonly aggregation_ms: number
  readonly journal_count: number
  readonly calendar_count: number
  readonly water_count: number
}

export interface NutritionJournalReadInstrumentation {
  readonly enabled: true
  readonly now?: () => number
}

export interface NutritionJournalReadInput {
  readonly client: SupabaseClient
  readonly userId: string
  readonly selectedDate: string
  readonly profile?: NutritionTabGoalSource | null
  readonly correlationId?: string
  readonly signal?: AbortSignal
  readonly instrumentation?: NutritionJournalReadInstrumentation
}

export type NutritionJournalReadResult =
  | {
    readonly status: 'success'
    readonly dailyLogs: readonly NutritionJournalRow[]
    readonly calendarDates: ReadonlySet<string>
    readonly waterTotal: number
    readonly summary: NutritionTabSummary
    readonly metrics?: NutritionJournalReadMetrics
  }
  | {
    readonly status: 'error'
    readonly metrics?: NutritionJournalReadMetrics
  }

type TimedResult<T> = { readonly value: T; readonly durationMs: number }

function roundedDuration(value: number): number {
  return Number(Math.max(0, value).toFixed(2))
}

function safeCorrelationId(value: string | undefined): string | null {
  if (value === undefined) return null
  if (!/^[A-Za-z][A-Za-z0-9._:-]{7,95}$/.test(value)) {
    throw new Error('NUTRITION_READ_CORRELATION_ID_INVALID')
  }
  return value
}

function withAbortSignal<T extends { abortSignal(signal: AbortSignal): T }>(
  query: T,
  signal: AbortSignal | undefined,
): T {
  return signal ? query.abortSignal(signal) : query
}

export async function readNutritionJournalCycle(
  input: NutritionJournalReadInput,
): Promise<NutritionJournalReadResult> {
  const instrumentationEnabled = input.instrumentation?.enabled === true
  const correlationId = safeCorrelationId(input.correlationId)
  const now = input.instrumentation?.now ?? (() => performance.now())
  const totalStartedAt = instrumentationEnabled ? now() : 0

  const measure = async <T>(operation: () => PromiseLike<T>): Promise<TimedResult<T>> => {
    if (!instrumentationEnabled) return { value: await operation(), durationMs: 0 }
    const startedAt = now()
    const value = await operation()
    return { value, durationMs: roundedDuration(now() - startedAt) }
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0]

  // Calling measure immediately starts all three PostgREST operations before
  // Promise.all awaits them. Keep this construction aligned with the hook's
  // historical parallel read contract.
  const journalRead = measure(() => withAbortSignal(
    input.client.from('daily_food_logs').select(NUTRITION_JOURNAL_PROJECTION)
      .eq('user_id', input.userId).eq('date', input.selectedDate)
      .order('created_at', { ascending: true }),
    input.signal,
  ))
  const calendarRead = measure(() => withAbortSignal(
    input.client.from('daily_food_logs').select('date')
      .eq('user_id', input.userId).gte('date', thirtyDaysAgo),
    input.signal,
  ))
  const waterRead = measure(() => withAbortSignal(
    input.client.from('water_intake').select('amount_ml')
      .eq('user_id', input.userId).eq('date', input.selectedDate).limit(50),
    input.signal,
  ))

  const [journal, calendar, water] = await Promise.all([
    journalRead,
    calendarRead,
    waterRead,
  ])

  const journalRows = journal.value.data ?? []
  const calendarRows = calendar.value.data ?? []
  const waterRows = water.value.data ?? []

  const metrics = (aggregationMs: number, totalMs: number): NutritionJournalReadMetrics | undefined => (
    instrumentationEnabled
      ? {
        correlation_id: correlationId,
        total_ms: roundedDuration(totalMs),
        journal_ms: journal.durationMs,
        calendar_ms: calendar.durationMs,
        water_ms: water.durationMs,
        aggregation_ms: roundedDuration(aggregationMs),
        journal_count: journalRows.length,
        calendar_count: calendarRows.length,
        water_count: waterRows.length,
      }
      : undefined
  )

  if (journal.value.error || calendar.value.error || water.value.error) {
    return {
      status: 'error',
      metrics: metrics(0, instrumentationEnabled ? now() - totalStartedAt : 0),
    }
  }

  const aggregationStartedAt = instrumentationEnabled ? now() : 0
  const dailyLogs = journalRows as readonly NutritionJournalRow[]
  const calendarDates = new Set(calendarRows.map(item => item.date))
  const waterTotal = waterRows.reduce((sum, item) => sum + (item.amount_ml ?? 0), 0)
  const summary = readNutritionTabSummary({
    rows: dailyLogs,
    journalState: dailyLogs.length ? 'ready' : 'empty',
    ownerUserId: input.userId,
    selectedDate: input.selectedDate,
    profile: input.profile,
  })
  const aggregationMs = instrumentationEnabled ? now() - aggregationStartedAt : 0

  return {
    status: 'success',
    dailyLogs,
    calendarDates,
    waterTotal,
    summary,
    metrics: metrics(
      aggregationMs,
      instrumentationEnabled ? now() - totalStartedAt : 0,
    ),
  }
}
