import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  NUTRITION_JOURNAL_PROJECTION,
  readNutritionJournalCycle,
} from '../../lib/nutrition/nutrition-journal-read-model'
import { DAILY_FOOD_LOG_PROJECTION } from '../../lib/repositories/nutrition'

type QueryResult = { data: unknown[] | null; error: unknown }
type RecordedCall = { table: string; method: string; args: unknown[] }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function clientWithResults(results: Array<QueryResult | Promise<QueryResult>>) {
  const calls: RecordedCall[] = []
  let queryIndex = 0
  const from = vi.fn((table: string) => {
    const result = results[queryIndex++] ?? { data: [], error: null }
    const chain: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'gte', 'order', 'limit', 'abortSignal']) {
      chain[method] = vi.fn((...args: unknown[]) => {
        calls.push({ table, method, args })
        return chain
      })
    }
    chain.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject)
    return chain
  })
  return { client: { from } as unknown as SupabaseClient, calls, from }
}

function callsFor(mock: ReturnType<typeof clientWithResults>, method: string) {
  return mock.calls.filter(call => call.method === method)
}

const owner = '00000000-0000-0000-0000-000000000001'
const selectedDate = '2026-08-11'
const journalRow = {
  id: 'log-1', user_id: owner, date: selectedDate, meal_type: 'dejeuner', food_id: null,
  custom_name: 'Synthetic food', quantity_g: 100, calories: 420, protein: 30,
  carbs: 45, fat: 12, created_at: '2026-08-11T12:00:00.000Z',
}

describe('Nutrition journal read model', () => {
  it('preserves the three exact owner-scoped reads and canonical result', async () => {
    expect(NUTRITION_JOURNAL_PROJECTION).toBe(DAILY_FOOD_LOG_PROJECTION)
    const mock = clientWithResults([
      { data: [journalRow], error: null },
      { data: [{ date: selectedDate }, { date: '2026-08-10' }], error: null },
      { data: [{ amount_ml: 250 }, { amount_ml: 300 }], error: null },
    ])
    const result = await readNutritionJournalCycle({
      client: mock.client,
      userId: owner,
      selectedDate,
      profile: { calorie_goal: 2_200, protein_goal: 160, carbs_goal: 240, fat_goal: 70 },
    })

    expect(mock.from.mock.calls.map(call => call[0])).toEqual([
      'daily_food_logs', 'daily_food_logs', 'water_intake',
    ])
    expect(callsFor(mock, 'select').map(call => [call.table, ...call.args])).toEqual([
      ['daily_food_logs', NUTRITION_JOURNAL_PROJECTION],
      ['daily_food_logs', 'date'],
      ['water_intake', 'amount_ml'],
    ])
    expect(callsFor(mock, 'eq').map(call => [call.table, ...call.args])).toEqual([
      ['daily_food_logs', 'user_id', owner],
      ['daily_food_logs', 'date', selectedDate],
      ['daily_food_logs', 'user_id', owner],
      ['water_intake', 'user_id', owner],
      ['water_intake', 'date', selectedDate],
    ])
    expect(callsFor(mock, 'order').map(call => [call.table, ...call.args])).toEqual([
      ['daily_food_logs', 'created_at', { ascending: true }],
    ])
    expect(callsFor(mock, 'gte')).toHaveLength(1)
    expect(callsFor(mock, 'limit').map(call => [call.table, ...call.args])).toEqual([
      ['water_intake', 50],
    ])
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.dailyLogs).toEqual([journalRow])
    expect([...result.calendarDates]).toEqual([selectedDate, '2026-08-10'])
    expect(result.waterTotal).toBe(550)
    expect(result.summary.consumption).toMatchObject({
      status: 'ready',
      value: { status: 'complete', values: { kcal: 420, protein: 30, carbs: 45, fat: 12 } },
    })
    expect(result.metrics).toBeUndefined()
  })

  it('starts all three reads before waiting for any result', async () => {
    const reads = [deferred<QueryResult>(), deferred<QueryResult>(), deferred<QueryResult>()]
    const mock = clientWithResults(reads.map(read => read.promise))
    const pending = readNutritionJournalCycle({ client: mock.client, userId: owner, selectedDate })

    expect(mock.from).toHaveBeenCalledTimes(3)
    reads[0].resolve({ data: [journalRow], error: null })
    reads[1].resolve({ data: [{ date: selectedDate }], error: null })
    reads[2].resolve({ data: [{ amount_ml: 250 }], error: null })
    await expect(pending).resolves.toMatchObject({ status: 'success' })
  })

  it('returns the historical error state when any Supabase read reports an error', async () => {
    const mock = clientWithResults([
      { data: [journalRow], error: null },
      { data: null, error: { code: '42501', message: 'private database detail' } },
      { data: [{ amount_ml: 250 }], error: null },
    ])
    const result = await readNutritionJournalCycle({ client: mock.client, userId: owner, selectedDate })
    expect(result).toEqual({ status: 'error', metrics: undefined })
    expect(JSON.stringify(result)).not.toContain('private database detail')
  })

  it('preserves unknown and invalid macro semantics in the shared summary', async () => {
    const mock = clientWithResults([
      {
        data: [{
          ...journalRow,
          calories: null,
          protein: -1,
          carbs: '45',
          fat: 0,
        }],
        error: null,
      },
      { data: [{ date: selectedDate }], error: null },
      { data: [], error: null },
    ])
    const result = await readNutritionJournalCycle({ client: mock.client, userId: owner, selectedDate })
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.summary.consumption).toMatchObject({
      status: 'ready',
      value: {
        status: 'partial',
        values: { kcal: null, protein: null, carbs: 45, fat: 0 },
      },
    })
  })

  it('keeps rejected transport operations as rejected promises', async () => {
    const rejected = Promise.reject(new Error('transport unavailable'))
    rejected.catch(() => undefined)
    const mock = clientWithResults([
      rejected,
      { data: [], error: null },
      { data: [], error: null },
    ])
    await expect(readNutritionJournalCycle({ client: mock.client, userId: owner, selectedDate }))
      .rejects.toThrow('transport unavailable')
  })

  it('emits bounded timing and cardinality metrics only when explicitly enabled', async () => {
    const mock = clientWithResults([
      { data: [journalRow], error: null },
      { data: [{ date: selectedDate }], error: null },
      { data: [{ amount_ml: 250 }], error: null },
    ])
    let instant = 0
    const result = await readNutritionJournalCycle({
      client: mock.client,
      userId: owner,
      selectedDate,
      correlationId: 'nutrition-load.test-0001',
      instrumentation: { enabled: true, now: () => ++instant },
    })
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.metrics).toEqual({
      correlation_id: 'nutrition-load.test-0001',
      total_ms: 9,
      journal_ms: 3,
      calendar_ms: 3,
      water_ms: 3,
      aggregation_ms: 1,
      journal_count: 1,
      calendar_count: 1,
      water_count: 1,
    })
    expect(JSON.stringify(result.metrics)).not.toMatch(/cookie|authorization|service.?role|password/i)
  })

  it('rejects correlation values that could carry unbounded or sensitive content', async () => {
    const mock = clientWithResults([
      { data: [], error: null }, { data: [], error: null }, { data: [], error: null },
    ])
    await expect(readNutritionJournalCycle({
      client: mock.client,
      userId: owner,
      selectedDate,
      correlationId: 'Bearer secret token',
      instrumentation: { enabled: true },
    })).rejects.toThrow('NUTRITION_READ_CORRELATION_ID_INVALID')
    expect(mock.from).not.toHaveBeenCalled()
  })
})
