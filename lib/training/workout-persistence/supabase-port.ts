import { updateProfile } from '@/lib/profile-service'
import type { DatabaseClient } from '@/lib/supabase/types'
import type { PersistenceWriteResult, WorkoutPersistencePort } from './types'

const result = <T>(value: T, error: unknown): PersistenceWriteResult<T> => error ? { ok: false } : { ok: true, value }

export function createSupabaseWorkoutPersistencePort(client: DatabaseClient): WorkoutPersistencePort {
  return {
    async createSession(payload) {
      const { data, error } = await client.from('workout_sessions').insert(payload).select('id').single()
      return data?.id ? result({ id: data.id }, error) : { ok: false }
    },
    async markScheduleCompleted(payload) {
      const { error } = await client.from('scheduled_sessions').update({ completed: true, completed_at: payload.completedAt })
        .eq('user_id', payload.userId).eq('scheduled_date', payload.scheduledDate).eq('completed', false)
      return result(undefined, error)
    },
    async createSets(payload) {
      const { error } = await client.from('workout_sets').insert(payload)
      return result(undefined, error)
    },
    async updateLastWorkout(payload) {
      try {
        await updateProfile(payload.userId, { last_workout_at: payload.completedAt }, client)
        return { ok: true, value: undefined }
      } catch { return { ok: false } }
    },
    async createCompletionMarker(payload) {
      const { error } = await client.from('completed_sessions').insert(payload)
      return result(undefined, error)
    },
  }
}
