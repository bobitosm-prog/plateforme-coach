import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('C08 weekly-diagnostic Nutrition goal static guard', () => {
  it('keeps the profile read projection, owner and single contract', () => {
    const generator = read('lib/weekly-diagnostic/generator.ts')
    expect(generator).toContain("from('profiles')")
    expect(generator).toContain(".select('*')")
    expect(generator).toContain(".eq('id', userId)")
    expect(generator).toContain('.single()')
  })

  it('routes all four profile goals through the C08 resolver', () => {
    const generator = read('lib/weekly-diagnostic/generator.ts')
    expect(generator).toContain('resolveWeeklyDiagnosticNutritionGoals(profile)')
    expect(generator).toContain('weeklyDiagnosticNutritionGoalFlags(goals)')
    expect(generator).not.toContain('Number(profile.calorie_goal || 0)')
    expect(generator).not.toContain('Number(profile.protein_goal || 0)')
  })

  it('fails closed on a profile transport error', () => {
    const generator = read('lib/weekly-diagnostic/generator.ts')
    expect(generator).toContain('profile_read_failed')
    expect(generator).toContain('profileRes.error')
  })

  it('keeps diagnostic and profile write statements structurally unchanged', () => {
    const generator = read('lib/weekly-diagnostic/generator.ts')
    expect(generator).toContain("from('weekly_diagnostics')")
    expect(generator).toContain('calorie_avg_target: calorieAvgTarget')
    expect(generator).toContain('protein_compliance_pct: proteinCompliancePct')
    expect(generator).toContain(".update({ next_diagnostic_at: nextDiagAt })")
  })

  it('does not add a plan read or write', () => {
    const generator = read('lib/weekly-diagnostic/generator.ts')
    expect(generator).not.toContain("from('meal_plans')")
    expect(generator).not.toContain("from('client_meal_plans')")
  })
})
