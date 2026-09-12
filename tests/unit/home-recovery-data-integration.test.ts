import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { collectRecoveryExerciseIds } from '@/app/hooks/useHomeDashboardModel'

describe('Home recovery data integration', () => {
  it('requests metadata only for completed sets in completed sessions', () => {
    expect(collectRecoveryExerciseIds([
      {
        completed: true,
        workout_sets: [
          { completed: true, exercise_id: 'bench' },
          { completed: false, exercise_id: 'row' },
          { completed: true, exercise_id: 'bench' },
        ],
      },
      { completed: false, workout_sets: [{ completed: true, exercise_id: 'squat' }] },
    ])).toEqual(['bench'])
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
