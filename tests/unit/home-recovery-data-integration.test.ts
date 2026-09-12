import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { collectRecoveryExerciseIds } from '@/lib/home/recovery-model'

const now = new Date('2026-09-12T12:00:00.000Z')

describe('Home recovery data integration', () => {
  it('requests metadata only for completed sets in completed sessions', () => {
    expect(collectRecoveryExerciseIds([
      {
        completed: true,
        created_at: '2026-09-11T12:00:00.000Z',
        workout_sets: [
          { completed: true, exercise_id: 'bench' },
          { completed: false, exercise_id: 'row' },
          { completed: true, exercise_id: 'bench' },
        ],
      },
      { completed: false, created_at: '2026-09-11T12:00:00.000Z', workout_sets: [{ completed: true, exercise_id: 'squat' }] },
    ], now)).toEqual(['bench'])
  })

  it('excludes exercise ids from sessions outside the seven-day window', () => {
    expect(collectRecoveryExerciseIds([
      { completed: true, created_at: '2026-09-05T11:59:59.000Z', workout_sets: [{ completed: true, exercise_id: 'old' }] },
      { completed: true, created_at: '2026-09-05T12:00:00.000Z', workout_sets: [{ completed: true, exercise_id: 'boundary' }] },
      { completed: true, created_at: 'invalid', workout_sets: [{ completed: true, exercise_id: 'invalid' }] },
      { completed: true, created_at: '2026-09-13T12:00:00.000Z', workout_sets: [{ completed: true, exercise_id: 'future' }] },
    ], now)).toEqual(['boundary', 'future'])
  })

  it('reuses dashboard workout sessions and limits the extra read to exercise metadata', () => {
    const page = readFileSync('app/(application)/page.tsx', 'utf8')
    const hook = readFileSync('app/hooks/useHomeDashboardModel.ts', 'utf8')

    expect(page).toContain('workoutSessions: h.wSessions ?? []')
    expect(hook).toContain("supabase.from('exercises_db')")
    expect(hook).toContain(".select('id,muscle_group')")
    expect(hook).not.toMatch(/from\('workout_(?:sessions|sets)'\)/)
  })
})
