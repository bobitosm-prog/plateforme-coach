import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const hook = readFileSync(new URL('../../app/hooks/useClientDashboard.ts', import.meta.url), 'utf8')
const dataHook = readFileSync(new URL('../../lib/client-dashboard/use-client-dashboard-data.ts', import.meta.url), 'utf8')
const fetchAll = dataHook.slice(dataHook.indexOf('async function fetchAll'), dataHook.indexOf('function retryProfileLoad'))

describe('useClientDashboard nutrition and measurements loading boundary', () => {
  it('delegates nutrition and measurements reads to the extracted loader', () => {
    expect(hook).toContain('createNutritionMeasurementsLoader(')
    expect(fetchAll).toContain('nutritionMeasurementsLoader.load(userId)')
  })

  it('removes direct nutrition and measurements reads from the aggregate fetch', () => {
    for (const table of [
      'weight_logs', 'body_measurements', 'progress_photos', 'client_meal_plans', 'daily_food_logs',
    ]) {
      expect(fetchAll).not.toMatch(new RegExp(`from\\(['"]${table}['"]\\)\\.select`))
    }
  })

  it('keeps the session/profile, Training, and owner-scoped cache boundaries', () => {
    expect(fetchAll).toContain('sessionProfileLoader.begin(userId)')
    expect(fetchAll).toContain('trainingDashboardLoader.load(userId)')
    expect(fetchAll).toContain('ownerUserId: userId')
    expect(fetchAll).toContain("sessionProfile.kind === 'cache'")
  })
})
