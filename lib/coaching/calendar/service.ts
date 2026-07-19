import type { CoachClientRelationRepository } from '@/lib/repositories/coach-client-relations'
import { appointmentInputSchema, calendarPeriodSchema, type AppointmentInput } from './schema'
import {
  calendarWeekPeriod, prepareAppointmentTimes, sortAppointments, upcomingCalendarPeriod,
  validateCalendarPeriod,
} from './model'
import type { CoachAppointmentRepository } from './repository'
import type {
  AppointmentNotificationPort, CalendarActor, CalendarClock, CalendarServiceResult, CoachAppointment,
} from './types'

interface CalendarServiceDependencies {
  appointments: CoachAppointmentRepository
  relations: CoachClientRelationRepository
  notifications: AppointmentNotificationPort
  clock: CalendarClock
  timeZone: string
}

function repositoryFailureCode(result: { kind: 'not_found' } | { kind: 'failure' }): string {
  return result.kind === 'not_found' ? 'NOT_FOUND' : 'PERSISTENCE_UNAVAILABLE'
}

function validAppointments(rows: CoachAppointment[]): CalendarServiceResult<CoachAppointment[]> {
  if (rows.some(row => row.status !== 'scheduled' || !Number.isFinite(Date.parse(row.scheduled_at)))) {
    return { ok: false, kind: 'invalid', code: 'APPOINTMENT_STATE_INVALID' }
  }
  return { ok: true, data: sortAppointments(rows) }
}

export function createCalendarService(dependencies: CalendarServiceDependencies) {
  const { appointments, relations, notifications, clock, timeZone } = dependencies
  return {
    async listForActor(
      actor: CalendarActor | null,
      rawPeriod: unknown,
      options: { limit?: number } = {},
    ): Promise<CalendarServiceResult<CoachAppointment[]>> {
      if (!actor) return { ok: false, kind: 'anonymous', code: 'AUTH_REQUIRED' }
      const parsed = calendarPeriodSchema.safeParse(rawPeriod)
      if (!parsed.success) return { ok: false, kind: 'invalid', code: 'PERIOD_INVALID' }
      const period = validateCalendarPeriod(parsed.data)
      if (!period.ok) return { ok: false, kind: 'invalid', code: period.code }
      const result = actor.role === 'coach'
        ? await appointments.listForCoach(actor.userId, period.data, options)
        : await appointments.listForClient(actor.userId, period.data, options)
      if (!result.ok) return { ok: false, kind: result.kind, code: repositoryFailureCode(result) }
      return validAppointments(result.data)
    },

    async listWeekForActor(
      actor: CalendarActor | null,
      offsetWeeks = 0,
      options: { limit?: number } = {},
    ): Promise<CalendarServiceResult<CoachAppointment[]>> {
      const period = calendarWeekPeriod(clock, timeZone, offsetWeeks)
      if (!period.ok) return { ok: false, kind: 'invalid', code: period.code }
      return this.listForActor(actor, period.data, options)
    },

    async listUpcomingForActor(
      actor: CalendarActor | null,
      options: { days?: number; limit?: number } = {},
    ): Promise<CalendarServiceResult<CoachAppointment[]>> {
      const period = upcomingCalendarPeriod(clock, options.days)
      if (!period.ok) return { ok: false, kind: 'invalid', code: period.code }
      return this.listForActor(actor, period.data, { limit: options.limit })
    },

    async create(
      actor: CalendarActor | null,
      rawInput: unknown,
    ): Promise<CalendarServiceResult<CoachAppointment>> {
      if (!actor) return { ok: false, kind: 'anonymous', code: 'AUTH_REQUIRED' }
      if (actor.role !== 'coach') return { ok: false, kind: 'forbidden', code: 'COACH_REQUIRED' }
      const candidate = rawInput && typeof rawInput === 'object'
        ? { ...rawInput, timeZone }
        : rawInput
      const parsed = appointmentInputSchema.safeParse(candidate)
      if (!parsed.success) return { ok: false, kind: 'invalid', code: 'APPOINTMENT_INPUT_INVALID' }
      const relation = await relations.findActiveBetween(actor.userId, parsed.data.clientUserId)
      if (!relation.ok) {
        return relation.kind === 'not_found'
          ? { ok: false, kind: 'forbidden', code: 'ACTIVE_RELATION_REQUIRED' }
          : { ok: false, kind: 'failure', code: 'RELATION_UNAVAILABLE' }
      }
      const times = prepareAppointmentTimes(parsed.data)
      if (!times.ok) return { ok: false, kind: 'invalid', code: times.code }
      const created = await appointments.createForCoach({
        coach_id: actor.userId,
        client_id: parsed.data.clientUserId,
        scheduled_at: times.data.scheduledAt,
        duration_minutes: times.data.durationMinutes,
        session_type: parsed.data.sessionType,
        location: parsed.data.location || null,
        notes: parsed.data.notes || null,
        status: 'scheduled',
      })
      if (!created.ok) return { ok: false, kind: created.kind, code: repositoryFailureCode(created) }
      void notifications.appointmentCreated({
        clientUserId: parsed.data.clientUserId,
        sessionType: parsed.data.sessionType,
        localDate: parsed.data.localDate,
        localTime: parsed.data.startTime,
      }).catch(() => undefined)
      return { ok: true, data: created.data }
    },

    async delete(actor: CalendarActor | null, appointmentId: string): Promise<CalendarServiceResult<null>> {
      if (!actor) return { ok: false, kind: 'anonymous', code: 'AUTH_REQUIRED' }
      if (actor.role !== 'coach') return { ok: false, kind: 'forbidden', code: 'COACH_REQUIRED' }
      const appointment = await appointments.findByIdForCoach(appointmentId, actor.userId)
      if (!appointment.ok) return { ok: false, kind: appointment.kind, code: repositoryFailureCode(appointment) }
      const relation = await relations.findActiveBetween(actor.userId, appointment.data.client_id)
      if (!relation.ok) {
        return relation.kind === 'not_found'
          ? { ok: false, kind: 'forbidden', code: 'ACTIVE_RELATION_REQUIRED' }
          : { ok: false, kind: 'failure', code: 'RELATION_UNAVAILABLE' }
      }
      const deleted = await appointments.deleteForCoach(appointmentId, actor.userId)
      return deleted.ok
        ? { ok: true, data: null }
        : { ok: false, kind: deleted.kind, code: repositoryFailureCode(deleted) }
    },
  }
}

export type CalendarService = ReturnType<typeof createCalendarService>
export type { AppointmentInput }
