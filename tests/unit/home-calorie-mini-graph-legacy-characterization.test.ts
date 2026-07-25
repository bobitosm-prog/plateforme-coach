import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const home = fs.readFileSync(
  path.join(process.cwd(), 'app/components/tabs/HomeTab.tsx'),
  'utf8',
)

function legacyAggregate(rows: readonly Record<string, unknown>[] | null | undefined) {
  const calByDay: Record<string, number> = {}
  ;(rows || []).forEach(row => {
    const day = (row.date as string) || ''
    calByDay[day] = (calByDay[day] || 0) + ((row.calories as number) || 0)
  })
  return Object.entries(calByDay).sort(([left], [right]) => left.localeCompare(right))
}

describe('Home calorie mini-graph legacy characterization', () => {
  it('uses one owner-scoped J-7 lower-bound read with the deployed projection and limit', () => {
    expect(home.match(/from\('daily_food_logs'\)/g)).toHaveLength(2)
    expect(home.match(/select\('calories, date'\)/g)).toHaveLength(1)
    expect(home).toContain(
      "from('daily_food_logs').select('calories, date').eq('user_id', userId)",
    )
    expect(home).toContain(
      ".gte('date', new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]).limit(200)",
    )
  })

  it('records the removed collection and metric fallbacks that erased failure and unknown values', () => {
    expect(legacyAggregate(undefined)).toEqual([])
    expect(legacyAggregate([])).toEqual([])
    expect(legacyAggregate([{ date: '2026-07-24', calories: null }])).toEqual([
      ['2026-07-24', 0],
    ])
    expect(legacyAggregate([{ date: '2026-07-24' }])).toEqual([
      ['2026-07-24', 0],
    ])
    expect(home).not.toContain(';(data || []).forEach((m: any) => {')
    expect(home).not.toContain(
      'calByDay[day] = (calByDay[day] || 0) + (m.calories || 0)',
    )
  })

  it('characterizes coercion and invalid-number behavior before the correction', () => {
    expect(legacyAggregate([{ date: '2026-07-24', calories: 0 }])).toEqual([
      ['2026-07-24', 0],
    ])
    expect(legacyAggregate([{ date: '2026-07-24', calories: '42' }])).toEqual([
      ['2026-07-24', '042'],
    ])
    expect(legacyAggregate([{ date: '2026-07-24', calories: Number.NaN }])).toEqual([
      ['2026-07-24', 0],
    ])
    expect(legacyAggregate([{ date: '2026-07-24', calories: Number.POSITIVE_INFINITY }]))
      .toEqual([['2026-07-24', Number.POSITIVE_INFINITY]])
    expect(legacyAggregate([{ date: '2026-07-24', calories: -12 }])).toEqual([
      ['2026-07-24', -12],
    ])
  })

  it('keeps failures and obsolete responses out of visible state without changing the query', () => {
    expect(home).toContain('.then(({ data, error }: {')
    expect(home).toContain(
      "return settleHomeCalorieMiniGraph(previous, { status: 'failure' }, isCurrentRequest)",
    )
    expect(home).toContain('return () => { homeCalorieGraphRequest.current += 1 }')
  })
})
