import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const detail = readFileSync('app/(application)/weekly-diagnostic/[id]/WeeklyDiagnosticDetailContent.tsx', 'utf8')
const preferences = readFileSync('app/components/NutritionPreferences.tsx', 'utf8')
const initial = readFileSync('app/hooks/useInitialGeneration.ts', 'utf8')

describe('Athena adjustment lifecycle', () => {
  it('uses server-owned weekly application and safe replacement for full generation', () => {
    expect(detail).toContain('/api/weekly-diagnostic/${diagnostic.id}/apply')
    expect(preferences).toContain('persist_generated_plan: true')
    expect(initial).toContain('replacePersonalMealPlan(supabase, userId, payload)')
  })

  it('does not mark a weekly adjustment applied before required plans exist', () => {
    const request = detail.indexOf('/api/weekly-diagnostic/${diagnostic.id}/apply')
    const success = detail.indexOf('if (!response.ok)', request)
    expect(request).toBeGreaterThan(-1)
    expect(success).toBeGreaterThan(request)
    expect(detail.indexOf('setApplied(true)', success)).toBeGreaterThan(success)
    expect(detail).not.toContain('await updateProfile(')
    expect(detail).not.toContain('replacePersonalMealPlan(')
    expect(detail).not.toContain(';(async () =>')
  })
})
