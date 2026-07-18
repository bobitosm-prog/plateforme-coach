import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const hook = readFileSync(new URL('../../app/hooks/useClientDashboard.ts', import.meta.url), 'utf8')
const dataHook = readFileSync(new URL('../../lib/client-dashboard/use-client-dashboard-data.ts', import.meta.url), 'utf8')
const fetchAll = dataHook.slice(dataHook.indexOf('async function fetchAll'), dataHook.indexOf('function retryProfileLoad'))

describe('useClientDashboard training loading boundary', () => {
  it('delegates the dashboard Training read to the extracted loader', () => {
    expect(hook).toContain('createTrainingDashboardLoader({')
    expect(fetchAll).toContain('trainingDashboardLoader.load(userId)')
  })

  it('removes direct Training table reads from the aggregate fetch', () => {
    for (const table of [
      'training_programs', 'user_programs', 'client_programs', 'custom_programs',
      'workout_sessions', 'completed_sessions', 'personal_records',
    ]) {
      expect(fetchAll).not.toMatch(new RegExp(`from\\(['"]${table}['"]\\)\\.select`))
    }
  })

  it('keeps cache ownership and session/profile loading unchanged', () => {
    expect(fetchAll).toContain('sessionProfileLoader.begin(userId)')
    expect(fetchAll).toContain('ownerUserId: userId')
    expect(fetchAll).toContain('sessionProfile.kind === \'cache\'')
  })
})
