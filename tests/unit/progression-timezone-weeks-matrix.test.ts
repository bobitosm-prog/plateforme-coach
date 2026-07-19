import { describe, expect, it } from 'vitest'
import {
  addCalendarDays,
  calendarDateAt,
  civilMonthBounds,
  groupLegacyWeeklyTonnage,
  groupMixedLocalUtcLegacyWeeklyTonnage,
  inCalendarWindow,
  legacyMixedLocalUtcMondayKey,
  mondayWeekBounds,
  rollingCalendarWindow,
  type CalendarDate,
} from '../../lib/progression'

describe('timezone, week and period matrix', () => {
  it.each([
    ['2026-03-29T00:59:59.999Z', 'Europe/Zurich', '2026-03-29'],
    ['2026-03-29T01:00:00.000Z', 'Europe/Zurich', '2026-03-29'],
    ['2026-03-29T22:30:00.000Z', 'Europe/Zurich', '2026-03-30'],
    ['2026-10-25T00:59:59.999Z', 'Europe/Zurich', '2026-10-25'],
    ['2026-10-25T01:00:00.000Z', 'Europe/Zurich', '2026-10-25'],
    ['2026-01-01T00:30:00.000Z', 'UTC', '2026-01-01'],
    ['2026-01-01T00:30:00.000Z', 'America/New_York', '2025-12-31'],
  ])('maps %s in %s to %s', (instant, timeZone, expected) => {
    expect(calendarDateAt(new Date(instant), timeZone)).toMatchObject({ status: 'complete', value: expected })
  })

  it.each([
    ['2026-01-04', '2025-12-29', '2026-01-05'],
    ['2026-01-05', '2026-01-05', '2026-01-12'],
    ['2026-12-31', '2026-12-28', '2027-01-04'],
    ['2024-02-29', '2024-02-26', '2024-03-04'],
  ] as const)('uses Monday bounds for %s', (date, start, end) => {
    expect(mondayWeekBounds(date)).toMatchObject({ status: 'complete', value: { startInclusive: start, endExclusive: end } })
  })

  it.each([
    ['2026-01-31', '2026-01-01', '2026-02-01'],
    ['2026-12-31', '2026-12-01', '2027-01-01'],
    ['2024-02-29', '2024-02-01', '2024-03-01'],
  ] as const)('builds civil month bounds for %s', (date, start, end) => {
    expect(civilMonthBounds(date)).toMatchObject({ status: 'complete', value: { startInclusive: start, endExclusive: end } })
  })

  it.each([7, 28, 30] as const)('uses inclusive start and exclusive end for %i calendar days', days => {
    const result = rollingCalendarWindow({ days, clock: { now: () => new Date('2026-03-29T22:30:00Z') }, timeZone: 'Europe/Zurich' })
    expect(result.status).toBe('complete')
    if (result.status !== 'complete') return
    expect(inCalendarWindow(result.value.startInclusive, result.value)).toBe(true)
    expect(inCalendarWindow(addCalendarDays(result.value.startInclusive, -1).value ?? '', result.value)).toBe(false)
    expect(inCalendarWindow(result.value.endExclusive, result.value)).toBe(false)
    expect(addCalendarDays(result.value.startInclusive, days).value).toBe(result.value.endExclusive)
  })

  it('keeps canonical and mixed legacy week strategies observably different at DST', () => {
    const instant = '2026-03-29T22:30:00.000Z'
    expect(groupLegacyWeeklyTonnage({ sets: [{ createdAt: instant, completed: true, weight: 10, reps: 2 }], timeZone: 'Europe/Zurich' })).toMatchObject({ status: 'complete', value: [{ week: '2026-03-30', volume: 20 }] })
    expect(groupMixedLocalUtcLegacyWeeklyTonnage({ sets: [{ createdAt: instant, completed: true, weight: 10, reps: 2 }], timeZone: 'Europe/Zurich' })).toMatchObject({ status: 'complete', value: [{ week: '2026-03-29', volume: 20 }] })
  })

  it('is deterministic for reordered inputs while keeping independent rows independent', () => {
    const sets = [
      { createdAt: '2026-01-05T10:00:00Z', completed: true, weight: 10, reps: 2 },
      { createdAt: '2025-12-31T10:00:00Z', completed: true, weight: 20, reps: 2 },
    ] as const
    expect(groupLegacyWeeklyTonnage({ sets, timeZone: 'UTC' })).toEqual(groupLegacyWeeklyTonnage({ sets: [...sets].reverse(), timeZone: 'UTC' }))
  })

  it.each([
    () => calendarDateAt(new Date('invalid'), 'UTC'),
    () => calendarDateAt(new Date('2026-01-01T00:00:00Z'), 'Invalid/Zone'),
    () => mondayWeekBounds('2026-02-30'),
    () => civilMonthBounds('not-a-date' as CalendarDate),
    () => legacyMixedLocalUtcMondayKey('invalid', 'Europe/Zurich'),
  ])('fails closed for invalid temporal input', operation => {
    expect(operation()).toMatchObject({ status: 'invalid' })
  })

  it('does not mutate the injected clock or input sets', () => {
    const now = new Date('2026-03-29T22:30:00Z')
    const clock = { now: () => new Date(now) }
    const before = now.toISOString()
    expect(rollingCalendarWindow({ days: 7, clock, timeZone: 'Europe/Zurich' })).toMatchObject({ status: 'complete' })
    expect(now.toISOString()).toBe(before)
  })
})
