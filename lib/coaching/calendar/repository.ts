import { repositoryFailure, type RepositoryResult } from '@/lib/repositories/result'
import type { DatabaseClient } from '@/lib/supabase/types'
import type { CalendarPeriod, CoachAppointment, NewCoachAppointment } from './types'

export const COACH_APPOINTMENT_PROJECTION =
  'id,coach_id,client_id,scheduled_at,duration_minutes,session_type,location,notes,status,created_at' as const

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function boundedLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)))
}

export function createCoachAppointmentRepository(client: DatabaseClient) {
  return {
    async listForCoach(
      coachUserId: string,
      period: CalendarPeriod,
      options: { limit?: number } = {},
    ): Promise<RepositoryResult<CoachAppointment[]>> {
      const { data, error } = await client.from('coach_appointments').select(COACH_APPOINTMENT_PROJECTION)
        .eq('coach_id', coachUserId).gte('scheduled_at', period.startInclusive)
        .lte('scheduled_at', period.endInclusive).order('scheduled_at', { ascending: true })
        .order('id', { ascending: true }).limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async listForClient(
      clientUserId: string,
      period: CalendarPeriod,
      options: { limit?: number } = {},
    ): Promise<RepositoryResult<CoachAppointment[]>> {
      const { data, error } = await client.from('coach_appointments').select(COACH_APPOINTMENT_PROJECTION)
        .eq('client_id', clientUserId).gte('scheduled_at', period.startInclusive)
        .lte('scheduled_at', period.endInclusive).order('scheduled_at', { ascending: true })
        .order('id', { ascending: true }).limit(boundedLimit(options.limit))
      return error ? repositoryFailure(error) : { ok: true, data: data ?? [] }
    },

    async findByIdForCoach(appointmentId: string, coachUserId: string): Promise<RepositoryResult<CoachAppointment>> {
      const { data, error } = await client.from('coach_appointments').select(COACH_APPOINTMENT_PROJECTION)
        .eq('id', appointmentId).eq('coach_id', coachUserId).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },

    async createForCoach(payload: NewCoachAppointment): Promise<RepositoryResult<CoachAppointment>> {
      const { data, error } = await client.from('coach_appointments').insert(payload)
        .select(COACH_APPOINTMENT_PROJECTION).maybeSingle()
      if (error) return repositoryFailure(error)
      return data ? { ok: true, data } : { ok: false, kind: 'not_found' }
    },

    async deleteForCoach(appointmentId: string, coachUserId: string): Promise<RepositoryResult<null>> {
      const { error } = await client.from('coach_appointments').delete()
        .eq('id', appointmentId).eq('coach_id', coachUserId)
      return error ? repositoryFailure(error) : { ok: true, data: null }
    },
  }
}

export type CoachAppointmentRepository = ReturnType<typeof createCoachAppointmentRepository>
