import { describe, expect, it } from 'vitest'
import { diagnosticWeek } from '@/lib/weekly-diagnostic/week'
import { confirmWeeklyCompletion, readWeeklyCompletion } from '@/lib/weekly-diagnostic/completion'

const now = new Date('2026-09-20T18:00:00Z')
function fixture() {
  const rows: Record<string, any[]> = {
    profiles: [{ id: 'u', created_at: '2026-09-19T08:00:00Z' }],
    daily_food_logs: [{ user_id: 'u', date: '2026-09-20', id: 'food', calories: 200 }],
    workout_sessions: [], scheduled_sessions: [], custom_programs: [], weekly_diagnostics: [], weekly_day_completions: [],
  }
  let fail = ''
  const db = { from(table: string) {
    const filters: [string, unknown][] = []
    let payload: any = null
    const result = (single = false) => {
      if (table === fail) return { data: null, error: new Error('Unavailable') }
      if (payload) rows[table] = [payload]
      const data = rows[table].filter(row => filters.every(([key, val]) => row[key] === val))
      return { data: single ? data[0] ?? null : data, error: null }
    }
    const q: any = {
      select: () => q, order: () => q, limit: () => q,
      eq: (k: string, v: unknown) => { filters.push([k, v]); return q },
      single: async () => result(true), maybeSingle: async () => result(true),
      upsert: (value: any) => { payload = value; return q },
      then: (resolve: any, reject: any) => Promise.resolve(result()).then(resolve, reject),
    }
    return q
  } }
  const confirm = (extra = {}) => confirmWeeklyCompletion(db, 'u', { weekStart: '2026-09-14', mealsConfirmed: true, ...extra }, now)
  return { rows, db, confirm, fail: (table: string) => { fail = table } }
}

describe('Zurich weekly calendar boundaries', () => {
  it.each([
    ['2026-09-19T21:59:59Z', '2026-09-07', '2026-09-13', '2026-09-14'],
    ['2026-09-19T22:00:00Z', '2026-09-14', '2026-09-20', '2026-09-21'],
    ['2026-09-20T22:00:00Z', '2026-09-14', '2026-09-20', '2026-09-21'],
    ['2026-03-29T12:00:00Z', '2026-03-23', '2026-03-29', '2026-03-30'],
    ['2026-10-25T12:00:00Z', '2026-10-19', '2026-10-25', '2026-10-26'],
    ['2027-01-03T12:00:00Z', '2026-12-28', '2027-01-03', '2027-01-04'],
  ])('%s selects a complete Monday–Sunday interval', (date, weekStart, sunday, endExclusive) => {
    expect(diagnosticWeek(new Date(date))).toMatchObject({ weekStart, sunday, endExclusive })
  })
})
describe('explicit Sunday closure', () => {
  it('keeps rest Sunday locked until meals are confirmed', async () => {
    const f = fixture()
    expect((await readWeeklyCompletion(f.db, 'u', now)).status).toMatchObject({ trainingState: 'rest', canGenerate: false })
    expect(await f.confirm({ mealsConfirmed: false })).toMatchObject({ status: 409 })
    expect(await f.confirm()).toMatchObject({ completion: { canGenerate: true } })
    expect(f.rows.weekly_day_completions[0].training_status).toBe('rest')
  })
  it('does not accept empty Sunday nutrition', async () => {
    const f = fixture(); f.rows.daily_food_logs = []
    expect(await f.confirm()).toMatchObject({ status: 409 })
  })
  it('requires finishing or explicitly skipping a scheduled workout', async () => {
    const f = fixture()
    f.rows.scheduled_sessions = [{ user_id: 'u', scheduled_date: '2026-09-20', id: 's', session_type: 'custom', completed: false }]
    expect(await f.confirm()).toMatchObject({ status: 409 })
    expect(await f.confirm({ skipTraining: true })).toMatchObject({ completion: { canGenerate: true } })
    expect(f.rows.weekly_day_completions[0].training_status).toBe('skipped')
    expect(f.rows.workout_sessions).toHaveLength(0)
  })
  it('accepts a recorded completed workout', async () => {
    const f = fixture()
    f.rows.scheduled_sessions = [{ user_id: 'u', scheduled_date: '2026-09-20', id: 's', session_type: 'custom', completed: false }]
    f.rows.workout_sessions = [{ user_id: 'u', date: '2026-09-20', id: 'w', completed: true }]
    expect(await f.confirm()).toMatchObject({ completion: { canGenerate: true, trainingState: 'completed' } })
  })
  it('also checks Sunday in an active personal program when the calendar is empty', async () => {
    const f = fixture()
    f.rows.custom_programs = [{ user_id: 'u', is_active: true, days: Array.from({ length: 7 }, (_, i) => ({ is_rest: i !== 6 })) }]
    expect(await f.confirm()).toMatchObject({ status: 409 })
  })
  it('invalidates confirmation after a meal edit', async () => {
    const f = fixture(); await f.confirm()
    f.rows.daily_food_logs[0].calories = 400
    expect((await readWeeklyCompletion(f.db, 'u', now)).status.canGenerate).toBe(false)
    expect(await f.confirm()).toMatchObject({ completion: { canGenerate: true } })
  })
  it('rejects future or stale weeks and weeks before registration', async () => {
    const f = fixture()
    expect(await f.confirm({ weekStart: '2026-09-21' })).toMatchObject({ status: 409 })
    expect(await confirmWeeklyCompletion(f.db, 'u', { weekStart: '2026-09-14', mealsConfirmed: true }, new Date('2026-09-19T12:00:00Z'))).toMatchObject({ status: 409 })
  })
  it('fails closed on database errors', async () => {
    const f = fixture(); f.fail('daily_food_logs')
    await expect(f.confirm()).rejects.toThrow('unavailable')
    expect(f.rows.weekly_day_completions).toHaveLength(0)
  })
  it('does not reopen an existing weekly diagnostic', async () => {
    const f = fixture(); await f.confirm()
    f.rows.weekly_diagnostics = [{ user_id: 'u', week_start: '2026-09-14', id: 'd' }]
    expect((await readWeeklyCompletion(f.db, 'u', now)).status).toMatchObject({ canGenerate: false, diagnosticId: 'd' })
  })
})
