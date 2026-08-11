import type { AssignedProgramRow } from '@/lib/repositories/training/program'

/** Exact INSERT payload produced by CoachPrograms.assignToClient. */
export const templateAssignmentWriterPayload = {
  client_id: 'client-writer-fixture',
  coach_id: 'coach-writer-fixture',
  training_program_id: 'template-writer-fixture',
  program_name: 'PPL writer fixture',
  program: [
    {
      name: 'Push',
      exercises: [
        { name: 'Développé couché', sets: 4, reps: '8-12', rest: 90 },
        { name: 'Développé militaire', sets: 3, reps: '10', rest: 60 },
      ],
    },
    {
      name: 'Pull',
      exercises: [{ name: 'Rowing', sets: 4, reps: '8-10', rest: 90 }],
    },
  ],
}

/** Row shape visible through ASSIGNED_PROGRAM_PROJECTION after that INSERT. */
export const templateAssignmentWriterRow: AssignedProgramRow = {
  id: 'assignment-from-template',
  client_id: templateAssignmentWriterPayload.client_id,
  coach_id: templateAssignmentWriterPayload.coach_id,
  training_program_id: templateAssignmentWriterPayload.training_program_id,
  program: templateAssignmentWriterPayload.program,
  created_at: '2026-08-11T09:00:00.000Z',
  updated_at: '2026-08-11T09:00:00.000Z',
}

/** Exact INSERT payload produced by saveClientDetailProgram after UI sanitization. */
export const clientDetailSaveWriterPayload = {
  client_id: 'client-writer-fixture',
  coach_id: 'coach-writer-fixture',
  week_start: '2026-08-10',
  program: {
    lundi: {
      repos: false,
      day_name: 'Haut du corps',
      exercises: [{ name: 'Pompes', sets: 3, reps: 12, rest: '60s', notes: '' }],
    },
    mardi: { repos: true, day_name: 'Repos', exercises: [] },
    mercredi: { repos: true, day_name: 'Repos', exercises: [] },
    jeudi: { repos: true, day_name: 'Repos', exercises: [] },
    vendredi: { repos: true, day_name: 'Repos', exercises: [] },
    samedi: { repos: true, day_name: 'Repos', exercises: [] },
    dimanche: { repos: true, day_name: 'Repos', exercises: [] },
  },
}

/** Row shape visible through ASSIGNED_PROGRAM_PROJECTION after that INSERT. */
export const clientDetailSaveWriterRow: AssignedProgramRow = {
  id: 'assignment-from-client-detail',
  client_id: clientDetailSaveWriterPayload.client_id,
  coach_id: clientDetailSaveWriterPayload.coach_id,
  training_program_id: null,
  program: clientDetailSaveWriterPayload.program,
  created_at: '2026-08-11T10:00:00.000Z',
  updated_at: '2026-08-11T10:00:00.000Z',
}
