import { describe, expect, it } from 'vitest'
import {
  aggregateHomeCalorieMiniGraph,
  settleHomeCalorieMiniGraph,
} from '@/lib/nutrition/home-calorie-mini-graph'

const window = {
  startInclusive: '2026-07-18',
  endInclusive: '2026-07-25',
} as const

describe('Home calorie mini-graph aggregation', () => {
  it('represents an empty week and an empty collection as graphical gaps', () => {
    const result = aggregateHomeCalorieMiniGraph([], window)
    expect(result.status).toBe('empty')
    expect(result.points).toHaveLength(8)
    expect(result.points.every(point => (
      point.calories === null && point.status === 'missing'
    ))).toBe(true)
  })

  it('preserves complete valid data, numeric strings and a real zero', () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      date: `2026-07-${String(18 + index).padStart(2, '0')}`,
      calories: index === 0 ? 0 : index === 1 ? '125.5' : 100 + index,
    }))
    const result = aggregateHomeCalorieMiniGraph(rows, window)
    expect(result.status).toBe('complete')
    expect(result.points[0]).toEqual({
      date: '2026-07-18',
      calories: 0,
      status: 'known',
    })
    expect(result.points[1]?.calories).toBe(125.5)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('keeps %s calories unknown instead of coercing them to zero', (_, calories) => {
    const result = aggregateHomeCalorieMiniGraph([
      { date: '2026-07-20', calories },
      { date: '2026-07-21' },
    ], window)
    expect(result.status).toBe('unavailable')
    expect(result.points.find(point => point.date === '2026-07-20')).toMatchObject({
      calories: null,
      status: 'unknown',
    })
    expect(result.points.find(point => point.date === '2026-07-21')).toMatchObject({
      calories: null,
      status: 'unknown',
    })
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negative', -1],
    ['invalid string', 'not-a-number'],
  ])('ignores an invalid %s point', (_, calories) => {
    const result = aggregateHomeCalorieMiniGraph([
      { date: '2026-07-20', calories },
    ], window)
    expect(result.status).toBe('invalid')
    expect(result.points.find(point => point.date === '2026-07-20')).toMatchObject({
      calories: null,
      status: 'invalid',
    })
  })

  it('keeps a valid value usable when an invalid row exists on the same day', () => {
    const result = aggregateHomeCalorieMiniGraph([
      { date: '2026-07-20', calories: 1810 },
      { date: '2026-07-20', calories: Number.NaN },
    ], window)
    expect(result.status).toBe('partial')
    expect(result.points.find(point => point.date === '2026-07-20')).toEqual({
      date: '2026-07-20',
      calories: 1810,
      status: 'known',
    })
  })

  it('makes an absent day a gap without changing known neighboring days', () => {
    const result = aggregateHomeCalorieMiniGraph([
      { date: '2026-07-19', calories: 1000 },
      { date: '2026-07-21', calories: 1200 },
    ], window)
    expect(result.points.find(point => point.date === '2026-07-20')).toEqual({
      date: '2026-07-20',
      calories: null,
      status: 'missing',
    })
  })

  it('ignores invalid dates and rows outside the requested UTC date window', () => {
    const result = aggregateHomeCalorieMiniGraph([
      { date: 'invalid', calories: 10 },
      { date: '2026-07-17', calories: 20 },
      { date: '2026-07-25', calories: 30 },
    ], window)
    expect(result.points.filter(point => point.calories !== null)).toEqual([
      { date: '2026-07-25', calories: 30, status: 'known' },
    ])
    expect(result.issues.map(issue => issue.code)).toEqual([
      'invalid_date',
      'outside_window',
    ])
  })
})

describe('Home calorie mini-graph request settlement', () => {
  const visible = [{
    date: '2026-07-25',
    calories: 1810,
    status: 'known' as const,
  }]
  const replacement = [{
    date: '2026-07-25',
    calories: 2000,
    status: 'known' as const,
  }]

  it('preserves the visible value after a Supabase failure', () => {
    expect(settleHomeCalorieMiniGraph(visible, { status: 'failure' }, true)).toBe(visible)
  })

  it('neutralizes an obsolete response that arrives after a valid response', () => {
    expect(settleHomeCalorieMiniGraph(
      visible,
      { status: 'ready', points: replacement },
      false,
    )).toBe(visible)
  })

  it('accepts a current successful collection', () => {
    expect(settleHomeCalorieMiniGraph(
      visible,
      { status: 'ready', points: replacement },
      true,
    )).toBe(replacement)
  })
})
