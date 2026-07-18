import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('pure workout session model boundary', () => {
  it('has no UI, browser, network or persistence dependency', () => {
    const source = read('lib/training/workout-session-model.ts')
    expect(source).not.toMatch(/from ['"](?:react|next|@supabase)|localStorage|sessionStorage|window|document|navigator|fetch\(|\.from\(['"]|JSX/)
  })

  it('is consumed by representative launch and rest flows', () => {
    expect(read('lib/client-dashboard/use-client-dashboard-actions.ts')).toContain('createLegacyWorkoutLaunch(')
    expect(read('app/components/WorkoutSession.tsx')).toContain('createWorkoutRestPeriod(')
  })

  it('does not alter the legacy SQL finalization chain', () => {
    const actions = read('lib/client-dashboard/use-client-dashboard-actions.ts')
    for (const table of ['workout_sessions', 'scheduled_sessions', 'workout_sets', 'completed_sessions']) {
      expect(actions).toContain(`from('${table}')`)
    }
    expect(read('lib/training/workout-session-model.ts')).not.toContain('workout_sessions')
  })
})
