import { describe, expect, it, vi } from 'vitest'

import {
  aggregateLegacyNutritionByDate,
  createAnalyticsReadModel,
  LatestAnalyticsReadCoordinator,
  type AnalyticsReadPort,
  type ProgressionPortResult,
} from '../../lib/progression'

const asLegacyRows = (value: unknown) => value as Parameters<typeof aggregateLegacyNutritionByDate>[0]
const ok = <T>(data: readonly T[]): ProgressionPortResult<T> => ({ ok: true, data })
const failed = (): ProgressionPortResult<never> => ({ ok: false, kind: 'failure' })

function port(nutrition: AnalyticsReadPort['listNutrition']): AnalyticsReadPort {
  return {
    listPersonalRecords: vi.fn(async () => ok([])),
    listNutrition: nutrition,
    listWater: vi.fn(async () => ok([])),
    listWeights: vi.fn(async () => ok([])),
    listCompletedSets: vi.fn(async () => ok([])),
  }
}

const context = {
  ownerUserId: 'analytics-owner',
  clock: { now: () => new Date('2026-07-24T12:00:00.000Z') },
  timeZone: 'Europe/Zurich',
}

describe('C02 legacy Analytics nutrition characterization', () => {
  it('keeps an empty period empty and omits days without rows', () => {
    expect(aggregateLegacyNutritionByDate([])).toEqual([])
    expect(aggregateLegacyNutritionByDate([
      { date: '2026-07-20', calories: 100, protein: 10, carbs: 20, fat: 5 },
      { date: '2026-07-22', calories: 200, protein: 20, carbs: 30, fat: 6 },
    ])).toEqual([
      { date: '2026-07-20', calories: 100, protein: 10, carbs: 20, fat: 5 },
      { date: '2026-07-22', calories: 200, protein: 20, carbs: 30, fat: 6 },
    ])
  })

  it('sums complete duplicate rows and preserves a real zero', () => {
    expect(aggregateLegacyNutritionByDate([
      { date: '2026-07-20', calories: 100, protein: 10, carbs: 20, fat: 5 },
      { date: '2026-07-20', calories: 0, protein: 5, carbs: 0, fat: 1 },
    ])).toEqual([
      { date: '2026-07-20', calories: 100, protein: 15, carbs: 20, fat: 6 },
    ])
  })

  it('silently converts null, undefined, an absent field and NaN to zero', () => {
    expect(aggregateLegacyNutritionByDate(asLegacyRows([
      { date: '2026-07-20', calories: null, protein: undefined, carbs: Number.NaN },
    ]))).toEqual([
      { date: '2026-07-20', calories: 0, protein: 0, carbs: 0, fat: 0 },
    ])
  })

  it('leaks numeric and non-numeric strings, Infinity and negatives through arithmetic', () => {
    expect(aggregateLegacyNutritionByDate(asLegacyRows([
      { date: '2026-07-20', calories: '12', protein: 'abc', carbs: Number.POSITIVE_INFINITY, fat: -4 },
    ]))).toEqual([
      { date: '2026-07-20', calories: '012', protein: '0abc', carbs: Number.POSITIVE_INFINITY, fat: -4 },
    ])
  })

  it('distinguishes a Supabase failure from confirmed emptiness in the read model', async () => {
    const empty = await createAnalyticsReadModel(port(vi.fn(async () => ok([])))).load(context)
    expect(empty).toMatchObject({ status: 'unavailable', data: { weeklyCalories: [] }, sources: [] })

    const error = await createAnalyticsReadModel(port(vi.fn(async () => failed()))).load(context)
    expect(error).toMatchObject({ status: 'partial', data: { weeklyCalories: [], nutritionStatus: 'failure' }, sources: ['nutrition'] })
  })

  it('rejects an obsolete response token after a newer Analytics request', () => {
    const coordinator = new LatestAnalyticsReadCoordinator()
    const first = coordinator.begin('analytics-owner')
    const second = coordinator.begin('analytics-owner')
    expect(coordinator.isCurrent(first)).toBe(false)
    expect(coordinator.isCurrent(second)).toBe(true)
  })
})
