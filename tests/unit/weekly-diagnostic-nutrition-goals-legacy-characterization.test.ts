import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const generator = fs.readFileSync(
  path.join(process.cwd(), 'lib/weekly-diagnostic/generator.ts'),
  'utf8',
)
const prompt = fs.readFileSync(
  path.join(process.cwd(), 'lib/ai/prompts/diagnostic.ts'),
  'utf8',
)

function legacyTargets(profile: Record<string, unknown>) {
  return {
    calories: Number(profile.calorie_goal || 0),
    protein: Number(profile.protein_goal || 0),
  }
}

function legacyProteinCompliance(
  proteinAverage: number | null,
  proteinGoal: number,
) {
  return proteinAverage !== null && proteinGoal > 0
    ? (proteinAverage / proteinGoal) * 100
    : null
}

describe('C08 legacy weekly-diagnostic Nutrition goals', () => {
  it('preserves valid calorie and protein targets', () => {
    expect(legacyTargets({
      calorie_goal: 1900,
      protein_goal: 140,
      carbs_goal: 220,
      fat_goal: 60,
    })).toEqual({ calories: 1900, protein: 140 })
    expect(legacyProteinCompliance(130, 140)).toBeCloseTo(92.857)
  })

  it('characterizes absent, null, empty and real zero targets as zeros', () => {
    expect(legacyTargets({})).toEqual({ calories: 0, protein: 0 })
    expect(legacyTargets({
      calorie_goal: null,
      protein_goal: '',
    })).toEqual({ calories: 0, protein: 0 })
    expect(legacyTargets({
      calorie_goal: 0,
      protein_goal: 0,
    })).toEqual({ calories: 0, protein: 0 })
  })

  it('characterizes numeric strings, invalid values and negatives', () => {
    expect(legacyTargets({
      calorie_goal: '1900',
      protein_goal: '140',
    })).toEqual({ calories: 1900, protein: 140 })
    expect(legacyTargets({
      calorie_goal: 'invalid',
      protein_goal: Number.POSITIVE_INFINITY,
    })).toEqual({ calories: Number.NaN, protein: Number.POSITIVE_INFINITY })
    expect(legacyTargets({
      calorie_goal: -1,
      protein_goal: -2,
    })).toEqual({ calories: -1, protein: -2 })
  })

  it('records that carbs and fat are selected but do not affect comparisons', () => {
    expect(legacyTargets({
      calorie_goal: 1900,
      protein_goal: 140,
      carbs_goal: 'invalid',
      fat_goal: null,
    })).toEqual({ calories: 1900, protein: 140 })
    expect(generator).not.toContain('profile.carbs_goal')
    expect(generator).not.toContain('profile.fat_goal')
  })

  it('records the preserved persistence fields after removing legacy fallbacks', () => {
    expect(generator).toContain('const profile = profileRes.data')
    expect(generator).toContain('profileRes.error')
    expect(generator).toContain('calorie_avg_target: calorieAvgTarget')
    expect(prompt).toContain('Calorie goal: ${calorieTarget} kcal')
    expect(prompt).toContain("Protein goal: ${proteinGoal ?? '?'} g")
    expect(prompt).toContain('Target: ${calorieTarget} kcal/jour')
  })
})
