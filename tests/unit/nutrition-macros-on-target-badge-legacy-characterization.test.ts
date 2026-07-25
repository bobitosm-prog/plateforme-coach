import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const badgeService = fs.readFileSync(
  path.join(process.cwd(), 'lib/check-badges.ts'),
  'utf8',
)
const badgeBoundary = fs.readFileSync(
  path.join(process.cwd(), 'lib/nutrition/macros-on-target-badge.ts'),
  'utf8',
)

function legacyMacrosOnTarget(
  calorieGoal: unknown,
  rows: readonly Record<string, unknown>[],
) {
  if (!calorieGoal) return 0
  const byDate: Record<string, number | string> = {}
  for (const row of rows) {
    const date = String(row.date)
    const previous = byDate[date] || 0
    const calories = row.calories || 0
    byDate[date] = typeof previous === 'string' || typeof calories === 'string'
      ? `${previous}${calories}`
      : Number(previous) + Number(calories)
  }
  return Object.values(byDate).filter(
    calories => Math.abs(Number(calories) - Number(calorieGoal)) / Number(calorieGoal) <= 0.1,
  ).length
}

describe('C07 legacy macros_on_target characterization', () => {
  it('characterizes absent, null, zero and NaN goals as zero matching days', () => {
    const rows = [{ date: '2026-07-25', calories: 100 }]
    expect(legacyMacrosOnTarget(undefined, rows)).toBe(0)
    expect(legacyMacrosOnTarget(null, rows)).toBe(0)
    expect(legacyMacrosOnTarget(0, rows)).toBe(0)
    expect(legacyMacrosOnTarget(Number.NaN, rows)).toBe(0)
  })

  it('characterizes null, absent and invalid calories as silent zero-like inputs', () => {
    expect(legacyMacrosOnTarget(100, [
      { date: '2026-07-25', calories: null },
      { date: '2026-07-24' },
      { date: '2026-07-23', calories: Number.NaN },
    ])).toBe(0)
  })

  it('characterizes numeric strings as concatenation and negatives as arithmetic', () => {
    expect(legacyMacrosOnTarget(100, [
      { date: '2026-07-25', calories: '50' },
      { date: '2026-07-25', calories: '50' },
      { date: '2026-07-24', calories: -10 },
    ])).toBe(0)
  })

  it('records the historical inclusive ten-percent threshold and three-day badge target', () => {
    expect(legacyMacrosOnTarget(100, [
      { date: '2026-07-25', calories: 89.99 },
      { date: '2026-07-24', calories: 90 },
      { date: '2026-07-23', calories: 110 },
      { date: '2026-07-22', calories: 110.01 },
    ])).toBe(2)
    expect(badgeBoundary).toContain('MACROS_ON_TARGET_CALORIE_TOLERANCE = 0.1')
    expect(badgeService).toContain('current >= badge.condition_value')
  })

  it('records the exact owner, order, limit and legacy error elision', () => {
    expect(badgeBoundary).toContain(".select('calorie_goal')")
    expect(badgeBoundary).toContain(".eq('id', ownerUserId)")
    expect(badgeBoundary).toContain(".select('date, calories')")
    expect(badgeBoundary).toContain(".eq('user_id', ownerUserId)")
    expect(badgeBoundary).toContain(".order('date', { ascending: false })")
    expect(badgeBoundary).toContain('.limit(200)')
  })
})
