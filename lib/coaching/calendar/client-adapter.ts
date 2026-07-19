import type { DatabaseClient } from '@/lib/supabase/types'
import { createCoachClientRelationRepository } from '@/lib/repositories/coach-client-relations'
import { createCoachAppointmentRepository } from './repository'
import { createCalendarService } from './service'
import type { AppointmentNotificationPort, CalendarClock } from './types'

interface FetchResponsePort {
  ok: boolean
}

export type CalendarFetchPort = (
  input: string,
  init: Readonly<{ method: 'POST'; headers: Readonly<Record<string, string>>; body: string }>,
) => Promise<FetchResponsePort>

export function createAppointmentNotificationPort(fetcher: CalendarFetchPort): AppointmentNotificationPort {
  return {
    async appointmentCreated(input) {
      await fetcher('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: input.clientUserId,
          title: 'Nouvelle séance planifiée',
          body: `${input.sessionType} · ${input.localDate} à ${input.localTime}`,
          url: '/',
        }),
      })
    },
  }
}

export function createCalendarClientAdapter(
  client: DatabaseClient,
  dependencies: Readonly<{
    fetcher: CalendarFetchPort
    clock: CalendarClock
    timeZone: string
  }>,
) {
  return createCalendarService({
    appointments: createCoachAppointmentRepository(client),
    relations: createCoachClientRelationRepository(client),
    clock: dependencies.clock,
    timeZone: dependencies.timeZone,
    notifications: createAppointmentNotificationPort(dependencies.fetcher),
  })
}
