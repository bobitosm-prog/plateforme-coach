import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('workout persistence boundary', () => {
  it('keeps the service free of React, Next, Supabase, browser and UI dependencies', () => {
    const service = read('lib/training/workout-persistence/service.ts')
    expect(service).not.toMatch(/from ['"](?:react|next|@supabase)|JSX|toast|fetch\(|window|document|localStorage|\.from\(['"]/)
  })

  it('delegates the detailed persistence chain from dashboard actions', () => {
    const actions = read('lib/client-dashboard/use-client-dashboard-actions.ts')
    expect(actions).toContain('persistDetailedWorkout(')
    expect(actions).not.toContain("from('workout_sessions').insert")
    expect(actions).not.toContain("from('workout_sets').insert")
    expect(actions).not.toContain("from('completed_sessions').insert")
  })

  it('keeps the quick TrainingTab persistence distinct and without workout_sets', () => {
    const controller = read('app/components/tabs/TrainingTabController.tsx')
    const quickFlow = controller.slice(controller.indexOf('async function finishTrainingWorkout()'), controller.indexOf('function handleExerciseInfo'))
    expect(quickFlow).toContain('persistQuickWorkout(')
    expect(quickFlow).not.toContain("from('workout_sets')")
  })
})
