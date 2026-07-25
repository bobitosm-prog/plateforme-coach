import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const facade = fs.readFileSync(
  path.join(process.cwd(), 'app/components/tabs/NutritionTab.tsx'),
  'utf8',
)
const journal = fs.readFileSync(
  path.join(process.cwd(), 'app/hooks/nutrition/useNutritionJournal.ts'),
  'utf8',
)
const dashboard = fs.readFileSync(
  path.join(process.cwd(), 'lib/client-dashboard/use-client-dashboard-data.ts'),
  'utf8',
)

describe('NutritionTab C05 runtime boundary', () => {
  it('removes hard-coded goals and the legacy macro sum', () => {
    expect(facade).not.toMatch(
      /profile\?\.(?:calorie|protein|carbs|fat)_goal \|\| (?:2000|140|200|60)/,
    )
    expect(facade).not.toContain('function getDailyLogsMacros()')
    expect(facade).toContain('readNutritionTabSummary({')
  })

  it('keeps the owner/date journal queries and stale-response protection', () => {
    expect(journal).toContain(
      ".eq('user_id', userId).eq('date', selectedDate).order('created_at', { ascending: true })",
    )
    expect(journal).toContain('const current = ++requestId.current')
    expect(journal).toContain('if (current !== requestId.current) return')
    expect(journal).toContain('return () => { requestId.current += 1 }')
  })

  it('keeps profile goals in the existing dashboard projection and failure boundary', () => {
    for (const goal of [
      'calorie_goal',
      'protein_goal',
      'carbs_goal',
      'fat_goal',
    ]) {
      expect(dashboard).toContain(goal)
    }
    expect(dashboard).toContain(
      "supabase.from('profiles').select(DASHBOARD_PROFILE_PROJECTION).eq('id', userId).single()",
    )
    expect(dashboard).toContain(
      "setProfileLoadStatus(hasConfirmedProfile() ? 'ready' : 'error')",
    )
  })

  it('does not add a profile or journal query in NutritionTab', () => {
    expect(facade).not.toContain("from('profiles')")
    expect(facade).not.toMatch(
      /from\('daily_food_logs'\)\.select\(/,
    )
  })
})
