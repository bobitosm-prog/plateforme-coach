import type { PersonalProgramRow } from '../../lib/repositories/training/program'

export const FREE_SESSION_PROGRAM_FIXTURE_NOW = '2026-08-13T18:00:00.000Z'
export const FREE_SESSION_PROGRAM_FIXTURE_OWNER = 'synthetic-free-session-client'

export const freeSessionWorkoutExercises = [
  {
    name: 'Presse horizontale synthétique',
    muscle: 'Pectoraux',
    targetSets: 4,
    targetReps: '10-12',
    rest: 90,
  },
  {
    name: 'Tirage synthétique',
    muscle: 'Dos',
    targetSets: 3,
    targetReps: 'AMRAP',
    rest: 75,
  },
] as const

export function buildPersistedFreeSessionCustomProgramFixture(): {
  insertPayload: {
    user_id: string
    name: string
    days: Array<{
      name: string
      exercises: Array<{
        exercise_name: string
        muscle_group: string
        sets: number
        reps: number
        rest_seconds: number
      }>
      is_rest: false
    }>
    source: 'free_session'
    is_active: false
  }
  row: PersonalProgramRow & { source: 'free_session' }
} {
  const name = 'Séance libre synthétique'
  const insertPayload = {
    user_id: FREE_SESSION_PROGRAM_FIXTURE_OWNER,
    name,
    days: [{
      name,
      exercises: freeSessionWorkoutExercises.map(exercise => ({
        exercise_name: exercise.name,
        muscle_group: exercise.muscle,
        sets: exercise.targetSets,
        reps: parseInt(String(exercise.targetReps)) || 10,
        rest_seconds: exercise.rest,
      })),
      is_rest: false as const,
    }],
    source: 'free_session' as const,
    is_active: false as const,
  }

  return {
    insertPayload,
    row: {
      id: 'synthetic-free-session-program',
      ...structuredClone(insertPayload),
      description: null,
      phases: null,
      scheduled: false,
      start_date: null,
      current_week: 1,
      total_weeks: null,
      created_at: FREE_SESSION_PROGRAM_FIXTURE_NOW,
      updated_at: FREE_SESSION_PROGRAM_FIXTURE_NOW,
    },
  }
}
