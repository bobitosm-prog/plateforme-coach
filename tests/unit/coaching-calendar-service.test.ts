import { describe, expect, it, vi } from 'vitest'
import { createAppointmentNotificationPort, createCalendarService } from '../../lib/coaching/calendar'

const appointment = {
  id: '00000000-0000-4000-8000-000000000010',
  coach_id: '00000000-0000-4000-8000-000000000001',
  client_id: '00000000-0000-4000-8000-000000000002',
  scheduled_at: '2026-07-19T08:00:00.000Z', duration_minutes: 60,
  session_type: 'Force', location: null, notes: null, status: 'scheduled',
  created_at: '2026-07-18T08:00:00.000Z',
}
const coach = { userId: appointment.coach_id, role: 'coach' as const }
const client = { userId: appointment.client_id, role: 'client' as const }
const period = { startInclusive: '2026-07-01T00:00:00.000Z', endInclusive: '2026-07-31T23:59:59.999Z' }
const input = {
  clientUserId: appointment.client_id, localDate: '2026-07-19', startTime: '10:00', endTime: '11:00',
  timeZone: 'Europe/Zurich', sessionType: 'Force', location: null, notes: null,
}

function dependencies() {
  return {
    appointments: {
      listForCoach: vi.fn(async () => ({ ok: true as const, data: [appointment] })),
      listForClient: vi.fn(async () => ({ ok: true as const, data: [appointment] })),
      findByIdForCoach: vi.fn(async () => ({ ok: true as const, data: appointment })),
      createForCoach: vi.fn(async () => ({ ok: true as const, data: appointment })),
      deleteForCoach: vi.fn(async () => ({ ok: true as const, data: null })),
    },
    relations: {
      findActiveBetween: vi.fn(async () => ({ ok: true as const, data: { id: 'relation' } })),
    },
    notifications: { appointmentCreated: vi.fn(async () => undefined) },
    clock: { now: () => new Date('2026-07-19T08:00:00.000Z') },
    timeZone: 'Europe/Zurich',
  }
}

describe('coaching calendar service', () => {
  it('rejects anonymous and role-incompatible mutations before ports', async () => {
    const deps = dependencies()
    const service = createCalendarService(deps as never)
    expect(await service.create(null, input)).toEqual({ ok: false, kind: 'anonymous', code: 'AUTH_REQUIRED' })
    expect(await service.create(client, input)).toEqual({ ok: false, kind: 'forbidden', code: 'COACH_REQUIRED' })
    expect(deps.relations.findActiveBetween).not.toHaveBeenCalled()
    expect(deps.appointments.createForCoach).not.toHaveBeenCalled()
  })

  it('creates only for an active relation and derives coach identity from the actor', async () => {
    const deps = dependencies()
    const result = await createCalendarService(deps as never).create(coach, input)
    expect(result).toEqual({ ok: true, data: appointment })
    expect(deps.relations.findActiveBetween).toHaveBeenCalledWith(coach.userId, client.userId)
    expect(deps.appointments.createForCoach).toHaveBeenCalledWith(expect.objectContaining({
      coach_id: coach.userId, client_id: client.userId, scheduled_at: appointment.scheduled_at,
      duration_minutes: 60, status: 'scheduled',
    }))
    expect(deps.notifications.appointmentCreated).toHaveBeenCalledOnce()
  })

  it.each([
    [{ ok: false as const, kind: 'not_found' as const }, 'forbidden', 'ACTIVE_RELATION_REQUIRED'],
    [{ ok: false as const, kind: 'failure' as const, error: { kind: 'unavailable' as const } }, 'failure', 'RELATION_UNAVAILABLE'],
  ])('fails closed when relation lookup is unavailable or absent', async (relation, kind, code) => {
    const deps = dependencies()
    deps.relations.findActiveBetween.mockResolvedValue(relation as never)
    expect(await createCalendarService(deps as never).create(coach, input)).toEqual({ ok: false, kind, code })
    expect(deps.appointments.createForCoach).not.toHaveBeenCalled()
  })

  it('rejects invalid dates, durations and unknown persisted statuses', async () => {
    const deps = dependencies()
    const service = createCalendarService(deps as never)
    expect(await service.create(coach, { ...input, endTime: '09:00' }))
      .toEqual({ ok: false, kind: 'invalid', code: 'DURATION_INVALID' })
    deps.appointments.listForCoach.mockResolvedValue({ ok: true, data: [{ ...appointment, status: 'mystery' }] })
    expect(await service.listForActor(coach, period)).toEqual({ ok: false, kind: 'invalid', code: 'APPOINTMENT_STATE_INVALID' })
  })

  it('keeps coach and client list scopes distinct and ordered', async () => {
    const deps = dependencies()
    const service = createCalendarService(deps as never)
    expect((await service.listForActor(coach, period)).ok).toBe(true)
    expect((await service.listForActor(client, period)).ok).toBe(true)
    expect(deps.appointments.listForCoach).toHaveBeenCalledWith(coach.userId, period, {})
    expect(deps.appointments.listForClient).toHaveBeenCalledWith(client.userId, period, {})
  })

  it('uses the injected clock and timezone for week and upcoming reads', async () => {
    const deps = dependencies()
    const service = createCalendarService(deps as never)
    expect((await service.listWeekForActor(coach, 0)).ok).toBe(true)
    expect((await service.listUpcomingForActor(client, { days: 30, limit: 10 })).ok).toBe(true)
    expect(deps.appointments.listForCoach).toHaveBeenCalledWith(coach.userId, expect.any(Object), {})
    expect(deps.appointments.listForClient).toHaveBeenCalledWith(client.userId, expect.any(Object), { limit: 10 })
  })

  it('checks current ownership and active relation before hard deletion', async () => {
    const deps = dependencies()
    const service = createCalendarService(deps as never)
    expect(await service.delete(coach, appointment.id)).toEqual({ ok: true, data: null })
    expect(deps.appointments.findByIdForCoach).toHaveBeenCalledWith(appointment.id, coach.userId)
    expect(deps.relations.findActiveBetween).toHaveBeenCalledWith(coach.userId, appointment.client_id)
    expect(deps.appointments.deleteForCoach).toHaveBeenCalledWith(appointment.id, coach.userId)
  })

  it('does not turn notification failure into persistence failure', async () => {
    const deps = dependencies()
    deps.notifications.appointmentCreated.mockRejectedValue(new Error('provider secret'))
    expect(await createCalendarService(deps as never).create(coach, input)).toEqual({ ok: true, data: appointment })
  })

  it('preserves the legacy notification endpoint and payload exactly', async () => {
    const fetcher = vi.fn(async () => ({ ok: true }))
    await createAppointmentNotificationPort(fetcher).appointmentCreated({
      clientUserId: client.userId,
      sessionType: 'Force',
      localDate: '2026-07-19',
      localTime: '10:00',
    })
    expect(fetcher).toHaveBeenCalledWith('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: client.userId,
        title: 'Nouvelle séance planifiée',
        body: 'Force · 2026-07-19 à 10:00',
        url: '/',
      }),
    })
  })
})
