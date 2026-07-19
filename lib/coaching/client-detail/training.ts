import { createTrainingProgramRepository, PERSONAL_PROGRAM_PROJECTION } from '@/lib/repositories/training/program'
import { createTrainingSessionRepository } from '@/lib/repositories/training/session'
import type { Json } from '@/lib/supabase/types'
import type { DatabaseClient } from '@/lib/supabase/types'
import type { ClientDetailLoadResult, ClientDetailMutationResult, ClientDetailScope, ClientDetailWorkoutSession } from './types'

export interface ClientDetailTrainingData {
  readonly assignedProgram: { readonly id: string; readonly program: Json } | null
  readonly customPrograms: readonly { readonly id: string; readonly name: string; readonly days: Json; readonly is_active: boolean | null; readonly created_at: string | null; readonly source: string | null }[]
  readonly coachTemplates: readonly { readonly id: string; readonly name: string; readonly program: Json }[]
  readonly sessions: readonly ClientDetailWorkoutSession[]
  readonly totalSessionsCount: number
}

export async function saveClientDetailProgram(client: DatabaseClient, scope: ClientDetailScope, input: { readonly programId: string | null; readonly program: Json; readonly weekStart: string; readonly updatedAt: string }): Promise<ClientDetailMutationResult<string | null>> {
  if (input.programId) {
    const result = await client.from('client_programs').update({ program: input.program, updated_at: input.updatedAt }).eq('id', input.programId).eq('coach_id', scope.coachUserId).eq('client_id', scope.clientUserId)
    return result.error ? { status: 'failure', stage: 'program' } : { status: 'success', data: input.programId }
  }
  const result = await client.from('client_programs').insert({ coach_id: scope.coachUserId, client_id: scope.clientUserId, program: input.program, week_start: input.weekStart } as never).select('id').single()
  return result.error ? { status: 'failure', stage: 'program' } : { status: 'success', data: result.data?.id ?? null }
}

function hasExercises(days: Json): boolean {
  if (!Array.isArray(days)) return false
  return days.some(day => Boolean(day && typeof day === 'object' && !Array.isArray(day) && Array.isArray(day.exercises) && day.exercises.length))
}

export async function loadClientDetailTraining(client: DatabaseClient, scope: ClientDetailScope): Promise<ClientDetailLoadResult<ClientDetailTrainingData>> {
  const programs = createTrainingProgramRepository(client)
  const sessions = createTrainingSessionRepository(client)
  const [assigned, personal, templates, workouts] = await Promise.all([
    programs.listAssignedProgramsForClient(scope.clientUserId),
    client.from('custom_programs').select(PERSONAL_PROGRAM_PROJECTION)
      .eq('user_id', scope.clientUserId).order('created_at', { ascending: false }).limit(10),
    programs.listCoachPrograms(scope.coachUserId),
    sessions.listWorkoutSessionsForClient(scope.clientUserId),
  ])
  if (!assigned.ok || personal.error || !templates.ok || !workouts.ok) return { status: 'unavailable', source: 'training' }
  const completed = workouts.data.filter(row => row.completed).slice(0, 100) as ClientDetailWorkoutSession[]
  return {
    status: 'success',
    data: {
      assignedProgram: assigned.data.find(row => row.coach_id === scope.coachUserId) ?? null,
      customPrograms: (personal.data ?? []).filter(row => hasExercises(row.days)),
      coachTemplates: templates.data.filter(row => row.is_template).map(({ id, name, program }) => ({ id, name, program })),
      sessions: completed,
      totalSessionsCount: workouts.data.filter(row => row.completed).length,
    },
  }
}
