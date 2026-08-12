import type { PersonalProgramRow } from '../../lib/repositories/training/program'
import { modernTrainingProgramOutputSchema } from '../../lib/ai/schemas'
import {
  normalizeProgramEditorDays,
  prepareLegacyProgramPayload,
} from '../../lib/training/program-editor-model'

export const AI_CUSTOM_PROGRAM_FIXTURE_NOW = '2026-08-12T12:00:00.000Z'
export const AI_CUSTOM_PROGRAM_FIXTURE_OWNER = 'synthetic-ai-client'

type ProviderOutput = ReturnType<typeof modernTrainingProgramOutputSchema.parse>
type ProviderDay = ProviderOutput['days'][number]
type ProviderExercise = ProviderDay['exercises'][number]
type CatalogResolvedOutput = Omit<ProviderOutput, 'days'> & {
  days: Array<Omit<ProviderDay, 'exercises'> & {
    exercises: Array<ProviderExercise & { exercise_id: string | null }>
  }>
}

export const aiCustomProgramProviderOutput = {
  program_name: 'Programme IA synthétique',
  description: 'Fixture sans donnée utilisateur issue du contrat provider.',
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
      muscle_groups: ['quadriceps', 'glutes'],
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

export function buildPersistedAiCustomProgramFixture(): {
  providerOutput: ProviderOutput
  catalogResolvedOutput: CatalogResolvedOutput
  row: PersonalProgramRow & { source: 'ai' }
} {
  const providerOutput = modernTrainingProgramOutputSchema.parse(
    structuredClone(aiCustomProgramProviderOutput),
  )
  const catalogIds = new Map<string, string | null>([
    ['Développé couché', 'catalog-bench'],
    ['Rowing assis', 'catalog-row'],
    ['Goblet squat', null],
  ])
  const catalogResolvedOutput = {
    ...providerOutput,
    days: providerOutput.days.map(day => ({
      ...day,
      exercises: day.exercises.map(exercise => ({
        ...exercise,
        exercise_id: catalogIds.get(exercise.custom_name) ?? null,
      })),
    })),
  }
  const normalizedDays = normalizeProgramEditorDays(catalogResolvedOutput.days).days
  const prepared = prepareLegacyProgramPayload({
    ownerUserId: AI_CUSTOM_PROGRAM_FIXTURE_OWNER,
    name: catalogResolvedOutput.program_name,
    description: catalogResolvedOutput.description,
    days: normalizedDays,
    source: 'ai',
    now: () => new Date(AI_CUSTOM_PROGRAM_FIXTURE_NOW),
  })
  if (!prepared.ok) throw new Error('Synthetic AI custom program fixture must be persistable')

  return {
    providerOutput,
    catalogResolvedOutput,
    row: {
      id: 'synthetic-ai-program',
      user_id: prepared.payload.user_id,
      name: prepared.payload.name,
      description: prepared.payload.description,
      days: prepared.payload.days as PersonalProgramRow['days'],
      phases: null,
      source: 'ai',
      is_active: true,
      scheduled: false,
      start_date: null,
      current_week: 1,
      total_weeks: null,
      created_at: AI_CUSTOM_PROGRAM_FIXTURE_NOW,
      updated_at: prepared.payload.updated_at,
    },
  }
}
