import type { AnalyticsWorkoutSession } from '../../lib/progression'

export const analyticsClock = { now: () => new Date('2026-04-01T12:00:00.000Z') }

export const analyticsSessions: readonly AnalyticsWorkoutSession[] = Object.freeze([
  {
    created_at: '2026-03-30T10:00:00.000Z',
    workout_sets: Object.freeze([
      { completed: true, exercise_id: 'bench', exercise_name: 'Bench', weight: 100, reps: 5, rir: 2, created_at: '2026-03-30T10:00:00.000Z' },
      { completed: true, exercise_id: 'bench', exercise_name: 'Bench', weight: 102, reps: 5, rir: 1, created_at: '2026-03-30T11:00:00.000Z' },
      { completed: true, exercise_id: 'bench', exercise_name: 'Bench', weight: 90, reps: 8, rir: 3, created_at: '2026-03-31T10:00:00.000Z' },
      { completed: true, exercise_id: 'bench', exercise_name: 'Bench', weight: 80, reps: 10, rir: 2, created_at: '2026-03-31T11:00:00.000Z' },
      { completed: true, exercise_id: 'bench', exercise_name: 'Bench', weight: 70, reps: 12, rir: 4, created_at: '2026-03-31T12:00:00.000Z' },
    ]),
  },
])
