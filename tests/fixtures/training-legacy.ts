export const coachTemplateFixture = {
  id: 'template-1',
  coach_id: 'coach-1',
  name: 'PPL Coach',
  description: 'Template coach',
  is_template: true,
  tags: ['hypertrophy'],
  program: {
    split: 'PPL',
    duration: '60 min',
    days: [{
      name: 'Push',
      exercises: [{ exercise_id: 'catalog-bench', name: 'Développé couché', sets: 2, reps: '8-12', rest: 90 }],
    }],
  },
} as const

export const clientDaysFixture = {
  id: 'assignment-array',
  client_id: 'client-1',
  coach_id: 'coach-1',
  training_program_id: 'template-1',
  program_name: 'PPL assigné',
  program: [{ name: 'Push', exercises: [{ name: 'Pompes', sets: 1, reps: 'AMRAP', rest: '60s' }] }],
} as const

export const clientWeekdaysFixture = {
  id: 'assignment-weekdays',
  client_id: 'client-1',
  coach_id: 'coach-1',
  program_name: 'Semaine française',
  program: {
    lundi: { day_name: 'Haut du corps', repos: false, exercises: [{ custom_exercise_id: 'custom-row', custom_name: 'Row perso', sets: 2, reps: 10, rest: '1m30s' }] },
    mardi: { day_name: 'Repos', repos: true, exercises: [] },
  },
} as const

export const customProgramFixture = {
  id: 'custom-program-1',
  user_id: 'client-1',
  name: 'Programme personnel',
  source: 'manual',
  is_active: true,
  days: [{
    day_number: 1,
    name: 'Full body',
    muscle_groups: ['chest', 'back'],
    exercises: [{ custom_name: 'Goblet squat', sets: 3, reps: 12, rest_seconds: 75, tempo: '2-0-2' }],
  }],
} as const

export const aiProgramFixture = {
  program_name: 'Programme IA',
  description: 'Sortie tool structurée',
  days: [{
    day_number: 1,
    name: 'Lower',
    focus: 'quads, glutes',
    exercises: [{ custom_name: 'Squat', muscle_primary: 'Quadriceps', sets: 2, reps: 8, rest_seconds: 120, order: 1 }],
  }],
} as const

export const moovxImportFixture = {
  name: 'Import MoovX',
  source: 'import',
  days: [{ name: 'Jour 1', exercises: [{ exercise_name: 'Tractions', sets: 3, reps: '6-8', rest_seconds: 120 }] }],
} as const

export const thirdPartyImportFixture = {
  name: 'Import Strong',
  source: 'import',
  days: [{ name: 'Workout', exercises: [{ name: 'Deadlift', sets: 3, reps: 5, rest_seconds: 180 }] }],
} as const

export const scheduledSessionFixture = {
  id: 'scheduled-1',
  user_id: 'client-1',
  title: 'Push',
  session_type: 'strength',
  scheduled_date: '2026-07-20',
  scheduled_time: '18:00:00',
  duration_min: 60,
  completed: false,
} as const

export const workoutHistoryFixture = {
  id: 'workout-1',
  user_id: 'client-1',
  name: 'Push',
  completed: true,
  duration_minutes: 45,
  created_at: '2026-07-17T10:00:00.000Z',
  workout_sets: [
    { id: 'set-2', exercise_id: 'catalog-bench', exercise_name: 'Développé couché', set_number: 2, reps: 8, weight: 82.5, rir: 1, completed: true },
    { id: 'set-1', exercise_id: 'catalog-bench', exercise_name: 'Développé couché', set_number: 1, reps: 10, weight: 80, rir: 2, completed: true },
    { id: 'set-3', exercise_name: 'Pompes', set_number: 1, reps: 20, weight: 0, completed: false },
  ],
} as const

export const completionFixture = {
  id: 'completion-1',
  client_id: 'client-1',
  coach_id: 'coach-1',
  program_id: 'assignment-array',
  session_index: 0,
  session_name: 'Push',
  completed_at: '2026-07-17T10:45:00.000Z',
  duration_minutes: 45,
} as const

export const personalRecordFixture = {
  id: 'record-1',
  user_id: 'client-1',
  exercise_name: 'Développé couché',
  record_type: 'max_weight',
  value: 82.5,
  unit: 'kg',
  achieved_at: '2026-07-17T10:45:00.000Z',
  previous_value: 80,
} as const
