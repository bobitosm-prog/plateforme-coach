import { modernTrainingProgramOutputSchema } from '../../lib/ai/schemas'
import type { PersonalProgramRow } from '../../lib/repositories/training/program'

export const ONBOARDING_PROGRAM_FIXTURE_NOW = '2026-08-12T14:00:00.000Z'
export const ONBOARDING_PROGRAM_FIXTURE_OWNER = 'synthetic-onboarding-client'

export const onboardingProgramProviderOutput = {
  program_name: 'Programme initial synthétique',
  description: 'Fixture du writer onboarding sans donnée utilisateur réelle.',
  days: [
    {
      day_number: 1,
      name: 'Haut du corps',
      focus: 'Pectoraux, Dos',
      muscle_groups: ['chest', 'back'],
      exercises: [
        {
          custom_name: 'Développé couché',
          muscle_primary: 'Pectoraux',
          sets: 4,
          reps: '8-10',
          rest_seconds: 120,
          order: 1,
          tempo: '3-1-1',
          technique: 'superset',
          technique_details: 'Rowing assis',
        },
        {
          custom_name: 'Rowing assis',
          muscle_primary: 'Dos',
          sets: 3,
          reps: 10,
          rest_seconds: 90,
          order: 2,
          tempo: '2-1-2',
          technique: null,
          technique_details: '',
        },
      ],
    },
    {
      day_number: 2,
      name: 'Bas du corps',
      focus: 'Quadriceps, Fessiers',
      muscle_groups: ['quads', 'glutes'],
      exercises: [
        {
          custom_name: 'Goblet squat',
          muscle_primary: 'Quadriceps',
          sets: 3,
          reps: 12,
          rest_seconds: 75,
          order: 1,
          tempo: '2-0-2',
          technique: null,
          technique_details: '',
        },
      ],
    },
  ],
} as const

export function buildPersistedOnboardingCustomProgramFixture(): {
  providerOutput: ReturnType<typeof modernTrainingProgramOutputSchema.parse>
  row: PersonalProgramRow & { source: 'onboarding_auto' }
} {
  const providerOutput = modernTrainingProgramOutputSchema.parse(
    structuredClone(onboardingProgramProviderOutput),
  )
  const catalogIds = new Map<string, string | null>([
    ['Développé couché', 'catalog-bench'],
    ['Rowing assis', 'catalog-row'],
    ['Goblet squat', null],
  ])
  const persistedDays = providerOutput.days.map(day => ({
    ...day,
    exercises: day.exercises.map(exercise => ({
      ...exercise,
      exercise_id: catalogIds.get(exercise.custom_name) ?? null,
    })),
  }))

  return {
    providerOutput,
    row: {
      id: 'synthetic-onboarding-program',
      user_id: ONBOARDING_PROGRAM_FIXTURE_OWNER,
      name: providerOutput.program_name,
      description: providerOutput.description,
      days: persistedDays,
      phases: null,
      source: 'onboarding_auto',
      is_active: true,
      scheduled: false,
      start_date: null,
      current_week: 1,
      total_weeks: null,
      created_at: ONBOARDING_PROGRAM_FIXTURE_NOW,
      updated_at: ONBOARDING_PROGRAM_FIXTURE_NOW,
    },
  }
}
