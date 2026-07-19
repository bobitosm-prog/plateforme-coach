import { describe, expect, it } from 'vitest'
import {
  calendarWeekPeriod, localDateTimeToInstant, prepareAppointmentTimes, sortAppointments,
  upcomingCalendarPeriod, validateCalendarPeriod,
} from '../../lib/coaching/calendar'

const baseInput = {
  clientUserId: '00000000-0000-4000-8000-000000000001',
  localDate: '2026-07-19', startTime: '10:00', endTime: '11:00',
  timeZone: 'Europe/Zurich', sessionType: 'Force', location: null, notes: null,
} as const

describe('coaching calendar model', () => {
  it('converts Zurich and UTC civil times without hiding the timezone', () => {
    expect(localDateTimeToInstant('2026-07-19', '10:00', 'Europe/Zurich'))
      .toEqual({ ok: true, data: '2026-07-19T08:00:00.000Z' })
    expect(localDateTimeToInstant('2026-07-19', '10:00', 'UTC'))
      .toEqual({ ok: true, data: '2026-07-19T10:00:00.000Z' })
  })

  it('fails closed for nonexistent, ambiguous and invalid local times', () => {
    expect(localDateTimeToInstant('2026-03-29', '02:30', 'Europe/Zurich'))
      .toEqual({ ok: false, code: 'LOCAL_TIME_NONEXISTENT' })
    expect(localDateTimeToInstant('2026-10-25', '02:30', 'Europe/Zurich'))
      .toEqual({ ok: false, code: 'LOCAL_TIME_AMBIGUOUS' })
    expect(localDateTimeToInstant('2026-07-19', '10:00', 'Invalid/Zone'))
      .toEqual({ ok: false, code: 'TIMEZONE_INVALID' })
  })

  it('requires a positive exact duration', () => {
    expect(prepareAppointmentTimes(baseInput)).toMatchObject({ ok: true, data: { durationMinutes: 60 } })
    expect(prepareAppointmentTimes({ ...baseInput, endTime: '10:00' }))
      .toEqual({ ok: false, code: 'DURATION_INVALID' })
    expect(prepareAppointmentTimes({ ...baseInput, endTime: '09:00' }))
      .toEqual({ ok: false, code: 'DURATION_INVALID' })
  })

  it('bounds periods and sorts immutably with an id tie-breaker', () => {
    expect(validateCalendarPeriod({ startInclusive: '2026-01-01T00:00:00.000Z', endInclusive: '2027-02-01T00:00:00.000Z' }))
      .toEqual({ ok: false, code: 'PERIOD_TOO_LARGE' })
    expect(validateCalendarPeriod({ startInclusive: '2026-01-02T00:00:00.000Z', endInclusive: '2026-01-01T00:00:00.000Z' }))
      .toEqual({ ok: false, code: 'PERIOD_INVALID' })
    const rows = [
      { id: 'b', scheduled_at: '2026-07-20T10:00:00Z' },
      { id: 'a', scheduled_at: '2026-07-20T10:00:00Z' },
      { id: 'c', scheduled_at: '2026-07-19T10:00:00Z' },
    ]
    expect(sortAppointments(rows).map(row => row.id)).toEqual(['c', 'a', 'b'])
    expect(rows.map(row => row.id)).toEqual(['b', 'a', 'c'])
  })

  it('builds DST-aware weeks and bounded upcoming periods from an injected clock', () => {
    const clock = { now: () => new Date('2026-03-29T22:30:00.000Z') }
    expect(calendarWeekPeriod(clock, 'Europe/Zurich')).toEqual({
      ok: true,
      data: {
        startInclusive: '2026-03-29T22:00:00.000Z',
        endInclusive: '2026-04-05T21:59:59.999Z',
      },
    })
    expect(upcomingCalendarPeriod(clock, 10)).toEqual({
      ok: true,
      data: {
        startInclusive: '2026-03-29T22:30:00.000Z',
        endInclusive: '2026-04-08T22:30:00.000Z',
      },
    })
  })
})
