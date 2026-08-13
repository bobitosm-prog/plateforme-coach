import type { PersonalProgramRow } from '../../lib/repositories/training/program'

export const IMPORT_UNKNOWN_FIXTURE_NOW = '2026-08-13T20:00:00.000Z'
export const IMPORT_UNKNOWN_FIXTURE_OWNER = 'synthetic-import-client'

export function buildPersistedImportUnknownFixture(): PersonalProgramRow & { source: 'import' } {
  return {
    id: 'synthetic-import-program',
    user_id: IMPORT_UNKNOWN_FIXTURE_OWNER,
    name: 'Programme importé synthétique',
    description: 'Ligne historique sans fichier ni parser persisté.',
    days: [
      {
        name: 'Séance A',
        is_rest: false,
        exercises: [
          {
            name: 'Mouvement poussé synthétique',
            exercise_name: 'Mouvement poussé synthétique',
            sets: 4,
            reps: 8,
            rest_seconds: 90,
            weight: 42.5,
            tempo: '3-1-1',
            technique: 'dropset',
            technique_details: 'Dernière série',
            phases: {
              p1: { sets: 4, reps: '8', tempo: '3-1-1' },
              p2: { sets: 4, reps: '6', tempo: '3-1-1' },
            },
          },
          {
            name: 'Mouvement tiré synthétique',
            exercise_name: 'Mouvement tiré synthétique',
            sets: 3,
            reps: 10,
            rest_seconds: 75,
          },
        ],
      },
      { name: 'Repos', is_rest: true, exercises: [] },
    ],
    phases: [
      { name: 'Phase historique', weeks: [1, 4], description: 'Métadonnée déjà persistée.' },
    ],
    source: 'import',
    is_active: true,
    scheduled: false,
    start_date: null,
    current_week: 1,
    total_weeks: 4,
    created_at: IMPORT_UNKNOWN_FIXTURE_NOW,
    updated_at: IMPORT_UNKNOWN_FIXTURE_NOW,
  }
}
