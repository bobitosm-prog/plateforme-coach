import { describe, expect, it } from 'vitest'

type LegacyRow = {
  user_id: string
  date: string
  is_completed?: unknown
}

function legacyMealAdherence(rows: LegacyRow[] | null | undefined, clientId: string) {
  let completed = 0
  for (const row of rows || []) {
    if (row.user_id === clientId && row.is_completed) completed += 1
  }
  return Math.round((completed / 28) * 100)
}

describe('C10 legacy coach Analytics meal adherence', () => {
  it('uses the historical fixed denominator of 28 meals', () => {
    expect(legacyMealAdherence([
      { user_id: 'client-a', date: '2026-07-20', is_completed: true },
      { user_id: 'client-a', date: '2026-07-21', is_completed: true },
    ], 'client-a')).toBe(7)
  })

  it('characterizes empty, null and failed reads as the same zero percent', () => {
    expect(legacyMealAdherence([], 'client-a')).toBe(0)
    expect(legacyMealAdherence(null, 'client-a')).toBe(0)
    expect(legacyMealAdherence(undefined, 'client-a')).toBe(0)
  })

  it('counts every truthy row including duplicates and invalid completion types', () => {
    expect(legacyMealAdherence([
      { user_id: 'client-a', date: '2026-07-20', is_completed: true },
      { user_id: 'client-a', date: '2026-07-20', is_completed: true },
      { user_id: 'client-a', date: '2026-07-21', is_completed: 'true' },
    ], 'client-a')).toBe(11)
  })

  it('keeps clients independent inside the grouped read', () => {
    const rows = [
      { user_id: 'client-a', date: '2026-07-20', is_completed: true },
      { user_id: 'client-b', date: '2026-07-20', is_completed: true },
    ]
    expect(legacyMealAdherence(rows, 'client-a')).toBe(4)
    expect(legacyMealAdherence(rows, 'client-b')).toBe(4)
    expect(legacyMealAdherence(rows, 'client-c')).toBe(0)
  })
})
