import { describe, expect, it } from 'vitest'
import {
  aggregateCoachMealAdherence,
  calculateCoachMealAdherencePercentage,
  isCurrentCoachAnalyticsResponse,
  resolveCoachMealAdherenceRead,
  settleCoachMealTrackingRead,
} from '@/lib/coaching/dashboard/meal-adherence'

const scope = ['client-a', 'client-b']
const fromDate = '2026-07-18'

describe('C10 coach Analytics meal adherence read model', () => {
  it('keeps a successful empty collection distinct from zero percent', () => {
    const result = aggregateCoachMealAdherence([], scope, fromDate)
    expect(result.get('client-a')).toEqual({
      status: 'no_tracking',
      completedMeals: 0,
      observedMeals: 0,
      percentage: null,
    })
    expect(result.get('client-b')?.percentage).toBeNull()
  })

  it('preserves the historical denominator and rounding for valid rows', () => {
    const oneMissed = aggregateCoachMealAdherence([
      { user_id: 'client-a', date: '2026-07-20', completed: false },
    ], scope, fromDate)
    expect(oneMissed.get('client-a')).toMatchObject({
      status: 'known',
      completedMeals: 0,
      observedMeals: 1,
      percentage: 0,
    })

    const completed = aggregateCoachMealAdherence([
      { user_id: 'client-a', date: '2026-07-20', completed: true },
    ], scope, fromDate)
    expect(completed.get('client-a')?.percentage).toBe(4)
  })

  it('aggregates several scoped clients independently', () => {
    const result = aggregateCoachMealAdherence([
      { user_id: 'client-a', date: '2026-07-20', completed: true },
      { user_id: 'client-a', date: '2026-07-21', completed: false },
      { user_id: 'client-b', date: '2026-07-20', completed: true },
      { user_id: 'outside', date: '2026-07-20', completed: true },
    ], scope, fromDate)
    expect(result.get('client-a')).toMatchObject({
      status: 'known',
      completedMeals: 1,
      observedMeals: 2,
      percentage: 4,
    })
    expect(result.get('client-b')?.percentage).toBe(4)
    expect(result.has('outside')).toBe(false)
  })

  it('keeps the fixed denominator for partial and complete periods', () => {
    const partial = aggregateCoachMealAdherence([
      { user_id: 'client-a', date: '2026-07-20', completed: true },
    ], scope, fromDate)
    const complete = aggregateCoachMealAdherence(
      Array.from({ length: 28 }, (_, index) => ({
        user_id: 'client-a',
        date: `2026-07-${String(18 + Math.floor(index / 4)).padStart(2, '0')}`,
        completed: true,
      })),
      scope,
      fromDate,
    )
    expect(partial.get('client-a')?.percentage).toBe(4)
    expect(complete.get('client-a')?.percentage).toBe(100)
  })

  it('preserves duplicate valid rows because the historical projection has no identity', () => {
    const result = aggregateCoachMealAdherence([
      { user_id: 'client-a', date: '2026-07-20', completed: true },
      { user_id: 'client-a', date: '2026-07-20', completed: true },
    ], scope, fromDate)
    expect(result.get('client-a')).toMatchObject({
      completedMeals: 2,
      observedMeals: 2,
      percentage: 7,
    })
  })

  it.each([
    ['invalid date', { user_id: 'client-a', date: 'invalid', completed: true }],
    ['null completion', { user_id: 'client-a', date: '2026-07-20', completed: null }],
    ['string completion', { user_id: 'client-a', date: '2026-07-20', completed: 'true' }],
  ])('makes a client non-calculable for an %s row', (_, row) => {
    expect(aggregateCoachMealAdherence([row], scope, fromDate).get('client-a')).toEqual({
      status: 'invalid',
      completedMeals: null,
      observedMeals: null,
      percentage: null,
    })
  })

  it('excludes a row before the preserved lower-bound window', () => {
    expect(aggregateCoachMealAdherence([
      { user_id: 'client-a', date: '2026-07-17', completed: true },
    ], scope, fromDate).get('client-a')?.status).toBe('no_tracking')
  })

  it('distinguishes Supabase errors, network rejection and null data from success', async () => {
    expect(settleCoachMealTrackingRead([], null)).toEqual({
      status: 'success',
      rows: [],
    })
    expect(settleCoachMealTrackingRead(null, new Error('private sql'))).toMatchObject({
      status: 'failure',
    })
    expect(settleCoachMealTrackingRead(null, null)).toMatchObject({
      status: 'failure',
    })
    await expect(Promise.reject(new Error('network'))).rejects.toThrow('network')
  })

  it('returns unavailable on a first failure and preserves a confirmed value afterward', () => {
    const failedFirst = resolveCoachMealAdherenceRead(
      { status: 'failure' },
      scope,
      fromDate,
    )
    expect(failedFirst.values.get('client-a')).toEqual({
      status: 'unavailable',
      completedMeals: null,
      observedMeals: null,
      percentage: null,
    })

    const confirmed = aggregateCoachMealAdherence([
      { user_id: 'client-a', date: '2026-07-20', completed: true },
    ], scope, fromDate)
    const failedAfterValue = resolveCoachMealAdherenceRead(
      { status: 'failure' },
      scope,
      fromDate,
      confirmed,
    )
    expect(failedAfterValue.values.get('client-a')).toEqual({
      status: 'stale',
      completedMeals: 1,
      observedMeals: 1,
      percentage: 4,
    })
  })

  it('refuses a zero denominator instead of returning NaN or a false success', () => {
    expect(calculateCoachMealAdherencePercentage(0, 0)).toBeNull()
    expect(calculateCoachMealAdherencePercentage(1, 0)).toBeNull()
    expect(calculateCoachMealAdherencePercentage(1, 28)).toBe(4)
  })

  it('identifies stale responses across request and coach scope changes', () => {
    expect(isCurrentCoachAnalyticsResponse(2, 2, 'coach-a', 'coach-a')).toBe(true)
    expect(isCurrentCoachAnalyticsResponse(1, 2, 'coach-a', 'coach-a')).toBe(false)
    expect(isCurrentCoachAnalyticsResponse(2, 2, 'coach-a', 'coach-b')).toBe(false)
  })
})
