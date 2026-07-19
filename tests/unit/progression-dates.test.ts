import { describe, expect, it } from 'vitest'
import { addCalendarDays, calendarDateAt, civilMonthBounds, inCalendarWindow, mondayWeekBounds, rollingCalendarWindow } from '../../lib/progression'
import { fixedClock } from '../fixtures/progression-aggregations'

describe('progression dates', () => {
  it('uses an explicit timezone at a day boundary', () => {
    expect(calendarDateAt(new Date('2026-01-01T00:30:00Z'), 'America/New_York')).toMatchObject({ status: 'complete', value: '2025-12-31' })
  })
  it('builds Monday weeks across year boundaries', () => {
    expect(mondayWeekBounds('2026-01-01')).toMatchObject({ status: 'complete', value: { startInclusive: '2025-12-29', endExclusive: '2026-01-05' } })
  })
  it('builds civil months including leap February', () => {
    expect(civilMonthBounds('2024-02-15')).toMatchObject({ status: 'complete', value: { startInclusive: '2024-02-01', endExclusive: '2024-03-01' } })
  })
  it.each([7, 28, 30] as const)('builds a %i-day inclusive rolling window', days => {
    const result = rollingCalendarWindow({ days, clock: fixedClock, timeZone: 'UTC' })
    expect(result.status).toBe('complete')
    if (result.status === 'complete') {
      expect(inCalendarWindow('2026-01-05', result.value)).toBe(true)
      expect(addCalendarDays(result.value.startInclusive, -1).status).toBe('complete')
    }
  })
  it('fails closed for invalid dates and timezones', () => {
    expect(mondayWeekBounds('2026-02-30')).toMatchObject({ status: 'invalid' })
    expect(calendarDateAt(new Date(), 'Invalid/Zone')).toMatchObject({ status: 'invalid' })
  })
})
