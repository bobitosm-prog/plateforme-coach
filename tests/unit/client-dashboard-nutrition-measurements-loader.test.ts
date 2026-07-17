import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '@/lib/supabase/types'
import {
  BODY_MEASUREMENTS_PROJECTION,
  COACH_MEAL_PLAN_PROJECTION,
  PROGRESS_PHOTOS_PROJECTION,
  WEIGHT_HISTORY_PROJECTION,
  createNutritionMeasurementsLoader,
  createNutritionMeasurementsReaders,
} from '@/lib/client-dashboard/nutrition-measurements-loader'

const success = <T>(data: T) => ({ ok: true as const, data })

const weights = [
  { date: '2026-07-01', poids: 81 },
  { date: '2026-07-17', poids: 80 },
]
const measurements = [{
  id: 'measure-2', user_id: 'client-1', date: '2026-07-17', chest: 100, waist: 80,
  hips: null, biceps: null, thighs: null, calves: null, created_at: '2026-07-17T10:00:00Z',
}]
const photos = [{
  id: 'photo-2', user_id: 'client-1', photo_url: 'client-1/photo.jpg', view_type: 'front',
  date: '2026-07-17', adjustments: { brightness: 1 }, ai_analysis: null, ai_analyzed_at: null,
  created_at: '2026-07-17T10:00:00Z',
}]
const mealPlan = { lundi: { meals: [{ name: 'Déjeuner' }] }, calorie_target: 2100 }

function setup(overrides: Record<string, unknown> = {}) {
  const readers = {
    listWeightHistory: vi.fn(async () => success(weights)),
    listBodyMeasurements: vi.fn(async () => success(measurements)),
    listProgressPhotos: vi.fn(async () => success(photos)),
    findLatestCoachMealPlan: vi.fn(async () => success({ plan: mealPlan })),
    ...overrides,
  }
  return { readers, loader: createNutritionMeasurementsLoader(readers as never) }
}

type QueryResult = { data: unknown; error: unknown }

function clientWith(result: QueryResult) {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'limit']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.maybeSingle = vi.fn(async () => result)
  chain.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  const client = { from: vi.fn(() => chain) } as unknown as DatabaseClient
  return { client, chain, from: client.from as ReturnType<typeof vi.fn> }
}

describe('client nutrition and measurements dashboard loader', () => {
  it('preserves complete legacy data and its repository order', async () => {
    const { loader } = setup()
    expect(await loader.load('client-1')).toEqual({
      ok: true,
      data: { weightHistory: weights, measurements, progressPhotos: photos, coachMealPlan: mealPlan },
    })
  })

  it('returns explicit empty values when no data exists', async () => {
    const { loader } = setup({
      listWeightHistory: vi.fn(async () => success([])),
      listBodyMeasurements: vi.fn(async () => success([])),
      listProgressPhotos: vi.fn(async () => success([])),
      findLatestCoachMealPlan: vi.fn(async () => ({ ok: false, kind: 'not_found' as const })),
    })
    expect(await loader.load('client-1')).toEqual({
      ok: true,
      data: { weightHistory: [], measurements: [], progressPhotos: [], coachMealPlan: null },
    })
  })

  it('returns an expurgated recoverable error with every failing source', async () => {
    const failure = (kind: 'forbidden' | 'unavailable', raw: string) => ({
      ok: false as const, kind: 'failure' as const, error: { kind, contextCode: 'PGRST000', raw },
    })
    const { loader } = setup({
      listWeightHistory: vi.fn(async () => failure('forbidden', 'private weight detail')),
      listProgressPhotos: vi.fn(async () => failure('unavailable', 'private photo detail')),
    })
    const result = await loader.load('client-1')
    expect(result).toEqual({
      ok: false,
      error: { kind: 'unavailable', sources: ['weight_history', 'progress_photos'] },
    })
    expect(JSON.stringify(result)).not.toMatch(/private weight|private photo/)
  })

  it('passes only the verified client scope to every reader', async () => {
    const { loader, readers } = setup()
    await loader.load('verified-client')
    for (const reader of Object.values(readers)) expect(reader).toHaveBeenCalledWith('verified-client')
  })

  it('does not mutate frozen legacy rows or meal-plan JSON', async () => {
    const frozenWeights = Object.freeze(weights.map(row => Object.freeze({ ...row })))
    const frozenPlan = Object.freeze({ lundi: Object.freeze({ meals: Object.freeze([]) }) })
    const { loader } = setup({
      listWeightHistory: vi.fn(async () => success(frozenWeights)),
      findLatestCoachMealPlan: vi.fn(async () => success({ plan: frozenPlan })),
    })
    const result = await loader.load('client-1')
    expect(result.ok && result.data.weightHistory).toBe(frozenWeights)
    expect(result.ok && result.data.coachMealPlan).toBe(frozenPlan)
  })

  it('uses explicit bounded projections and client ownership filters', async () => {
    const mock = clientWith({ data: [], error: null })
    const readers = createNutritionMeasurementsReaders(mock.client)

    await readers.listWeightHistory('client-1')
    expect(mock.from).toHaveBeenLastCalledWith('weight_logs')
    expect(mock.chain.select).toHaveBeenLastCalledWith(WEIGHT_HISTORY_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('user_id', 'client-1')
    expect(mock.chain.order).toHaveBeenCalledWith('date', { ascending: true })
    expect(mock.chain.limit).toHaveBeenCalledWith(30)

    await readers.listBodyMeasurements('client-1')
    expect(mock.chain.select).toHaveBeenLastCalledWith(BODY_MEASUREMENTS_PROJECTION)
    expect(mock.chain.order).toHaveBeenLastCalledWith('date', { ascending: false })
    expect(mock.chain.limit).toHaveBeenLastCalledWith(10)

    await readers.listProgressPhotos('client-1')
    expect(mock.chain.select).toHaveBeenLastCalledWith(PROGRESS_PHOTOS_PROJECTION)
    expect(mock.chain.order).toHaveBeenLastCalledWith('date', { ascending: false })
    expect(mock.chain.limit).toHaveBeenLastCalledWith(20)

    await readers.findLatestCoachMealPlan('client-1')
    expect(mock.chain.select).toHaveBeenLastCalledWith(COACH_MEAL_PLAN_PROJECTION)
    expect(mock.chain.eq).toHaveBeenCalledWith('client_id', 'client-1')
    expect(mock.chain.order).toHaveBeenLastCalledWith('created_at', { ascending: false })
  })

  it('expurgates raw Supabase errors in the concrete readers', async () => {
    const mock = clientWith({ data: null, error: { code: '42501', message: 'private SQL detail' } })
    const result = await createNutritionMeasurementsReaders(mock.client).listWeightHistory('client-1')
    expect(result).toEqual({
      ok: false, kind: 'failure', error: { kind: 'forbidden', contextCode: '42501' },
    })
    expect(JSON.stringify(result)).not.toContain('private SQL detail')
  })

  it('has no wildcard query, client construction, or forbidden framework import', () => {
    const source = readFileSync(new URL('../../lib/client-dashboard/nutrition-measurements-loader.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/select\(['"]\*['"]|select\([^)]*\*\)/)
    expect(source).not.toMatch(/from ['"](?:react|next|@\/app)|createClient|supabase\/admin|supabase\/browser|supabase\/server/)
    expect(source).not.toContain('service_role')
  })
})
