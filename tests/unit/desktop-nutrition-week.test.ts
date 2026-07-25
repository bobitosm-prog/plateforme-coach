import { describe, expect, it } from 'vitest'
import {
  aggregateDesktopNutritionWeek,
  createDesktopNutritionWeekWindow,
  readDesktopNutritionWeekResponse,
  settleDesktopNutritionWeek,
} from '@/lib/nutrition/desktop-nutrition-week'

const now = new Date('2026-07-25T12:00:00.000Z')
const window = createDesktopNutritionWeekWindow(now)
const dates = window.points.map(point => point.date)

describe('desktop nutrition week aggregation', () => {
  it('creates the historical seven-day UTC window with inclusive bounds', () => {
    expect(window.startInclusive).toBe('2026-07-19')
    expect(window.endInclusive).toBe('2026-07-25')
    expect(dates).toEqual([
      '2026-07-19',
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
    ])
  })

  it('keeps an empty period as seven missing gaps', () => {
    const result = aggregateDesktopNutritionWeek([], window)
    expect(result.status).toBe('empty')
    expect(result.points).toHaveLength(7)
    expect(result.points.every(point => (
      point.calories === null && point.status === 'missing'
    ))).toBe(true)
  })

  it('keeps a partial period and real zero distinct from missing days', () => {
    const result = aggregateDesktopNutritionWeek([
      { date: dates[0], calories: 0 },
      { date: dates[6], calories: 1810 },
    ], window)
    expect(result.status).toBe('partial')
    expect(result.points[0]).toMatchObject({ calories: 0, status: 'known' })
    expect(result.points[1]).toMatchObject({ calories: null, status: 'missing' })
    expect(result.points[6]).toMatchObject({ calories: 1810, status: 'known' })
  })

  it('keeps a complete valid period and historical final rounding', () => {
    const result = aggregateDesktopNutritionWeek(
      dates.flatMap((date, index) => index === 6
        ? [{ date, calories: 100.4 }, { date, calories: 200.4 }]
        : [{ date, calories: index * 100 }]),
      window,
    )
    expect(result.status).toBe('complete')
    expect(result.points.map(point => point.calories))
      .toEqual([0, 100, 200, 300, 400, 500, 301])
  })

  it.each([
    ['null', null, 'unknown'],
    ['undefined', undefined, 'unknown'],
    ['absent', Symbol.for('absent'), 'unknown'],
    ['empty string', '', 'unknown'],
    ['invalid string', 'nope', 'invalid'],
    ['NaN', Number.NaN, 'invalid'],
    ['Infinity', Number.POSITIVE_INFINITY, 'invalid'],
    ['negative', -1, 'invalid'],
  ] as const)('turns %s calories into a gap', (_, calories, status) => {
    const row: Record<string, unknown> = { date: dates[3] }
    if (calories !== Symbol.for('absent')) row.calories = calories
    const result = aggregateDesktopNutritionWeek([row], window)
    expect(result.points[3]).toMatchObject({ calories: null, status })
  })

  it('converts a non-empty numeric string', () => {
    const result = aggregateDesktopNutritionWeek([
      { date: dates[2], calories: '120.5' },
    ], window)
    expect(result.points[2]).toMatchObject({ calories: 121, status: 'known' })
  })

  it('makes the day a gap when one of several rows is unknown or invalid', () => {
    const result = aggregateDesktopNutritionWeek([
      { date: dates[4], calories: 100 },
      { date: dates[4], calories: null },
      { date: dates[5], calories: 200 },
      { date: dates[5], calories: 'invalid' },
    ], window)
    expect(result.points[4]).toMatchObject({ calories: null, status: 'unknown' })
    expect(result.points[5]).toMatchObject({ calories: null, status: 'invalid' })
  })

  it('ignores and reports rows outside the seven-day window', () => {
    const result = aggregateDesktopNutritionWeek([
      { date: '2026-07-18', calories: 100 },
      { date: '2026-07-26', calories: 200 },
    ], window)
    expect(result.status).toBe('invalid')
    expect(result.points.every(point => point.calories === null)).toBe(true)
    expect(result.issues.map(issue => issue.code)).toEqual([
      'outside_window',
      'outside_window',
    ])
  })
})

describe('desktop nutrition week read lifecycle', () => {
  const visible = aggregateDesktopNutritionWeek([
    { date: dates[6], calories: 1810 },
  ], window)
  const initial = { status: 'loading' as const, value: null, ownerUserId: 'owner-1' }
  const ready = { status: 'ready' as const, value: visible, ownerUserId: 'owner-1' }

  it('distinguishes a Supabase error and network rejection from an empty period', () => {
    expect(readDesktopNutritionWeekResponse(null, { code: 'PGRST000' }, window))
      .toEqual({ status: 'failure' })
    expect(settleDesktopNutritionWeek(initial, { status: 'failure' }, true, 'owner-1'))
      .toEqual({ status: 'failure', value: null, ownerUserId: 'owner-1' })
  })

  it('preserves a visible series after an error', () => {
    expect(settleDesktopNutritionWeek(ready, { status: 'failure' }, true, 'owner-1'))
      .toEqual({ status: 'failure', value: visible, ownerUserId: 'owner-1' })
  })

  it('does not preserve another owner series', () => {
    expect(settleDesktopNutritionWeek(ready, { status: 'failure' }, true, 'owner-2'))
      .toEqual({ status: 'failure', value: null, ownerUserId: 'owner-2' })
  })

  it('neutralizes an obsolete response', () => {
    const replacement = readDesktopNutritionWeekResponse([], null, window)
    expect(settleDesktopNutritionWeek(ready, replacement, false, 'owner-1')).toBe(ready)
  })
})
