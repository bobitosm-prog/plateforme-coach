import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const facade = readFileSync(new URL('../../app/hooks/useClientDashboard.ts', import.meta.url), 'utf8')
const dataHook = readFileSync(new URL('../../lib/client-dashboard/use-client-dashboard-data.ts', import.meta.url), 'utf8')
const actionsHook = readFileSync(new URL('../../lib/client-dashboard/use-client-dashboard-actions.ts', import.meta.url), 'utf8')

describe('useClientDashboard facade boundaries', () => {
  it('keeps the public facade below 250 lines', () => {
    expect(facade.trimEnd().split('\n').length).toBeLessThan(250)
  })

  it('delegates loading and mutations to focused internal hooks', () => {
    expect(facade).toContain('useClientDashboardData({')
    expect(facade).toContain('useClientDashboardActions({')
    expect(dataHook).toContain('sessionProfileLoader.begin(userId)')
    expect(actionsHook).toContain('async function onFinishWorkout')
  })

  it('preserves representative public return fields used by the page', () => {
    for (const field of [
      'profileLoadStatus', 'retryProfileLoad', 'profile', 'measurements', 'progressPhotos',
      'wSessions', 'coachProgram', 'coachMealPlan', 'weightHistory30', 'workoutSession',
      'fetchAll', 'scheduledSessions', 'personalRecords', 'latestDiagnostic',
    ]) expect(facade).toMatch(new RegExp(`\\b${field}\\b`))
  })

  it('introduces no explicit any, wildcard select, client construction, or server privilege', () => {
    const extracted = `${dataHook}\n${actionsHook}`
    expect(extracted).not.toMatch(/:\s*any\b|<any>|as any/)
    expect(extracted).not.toMatch(/select\(['"]\*['"]|select\([^)]*\*\)/)
    expect(extracted).not.toMatch(/createClient|supabase\/admin|supabase\/server|service_role|from ['"]@\/app/)
  })
})
