import type { Tables, TablesInsert } from '@/lib/supabase/types'

export const APPOINTMENT_STATUSES = ['scheduled'] as const
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number]

export type CoachAppointment = Pick<Tables<'coach_appointments'>,
  'id' | 'coach_id' | 'client_id' | 'scheduled_at' | 'duration_minutes' |
  'session_type' | 'location' | 'notes' | 'status' | 'created_at'>

export type NewCoachAppointment = Pick<TablesInsert<'coach_appointments'>,
  'coach_id' | 'client_id' | 'scheduled_at' | 'duration_minutes' |
  'session_type' | 'location' | 'notes' | 'status'>

export interface CalendarActor {
  readonly userId: string
  readonly role: 'coach' | 'client'
}

export interface CalendarClock {
  now(): Date
}

export interface CalendarPeriod {
  readonly startInclusive: string
  readonly endInclusive: string
}

export type CalendarServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'anonymous' | 'forbidden' | 'not_found' | 'invalid' | 'failure'; code: string }

export interface AppointmentNotificationPort {
  appointmentCreated(input: Readonly<{
    clientUserId: string
    sessionType: string
    localDate: string
    localTime: string
  }>): Promise<void>
}
