import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const journal = fs.readFileSync(
  path.join(process.cwd(), 'app/hooks/nutrition/useNutritionJournal.ts'),
  'utf8',
)

function legacyConsumption(rows: readonly Record<string, unknown>[]) {
  const totals: Record<'kcal' | 'protein' | 'carbs' | 'fat', number | string> = {
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  }
  const add = (left: number | string, right: unknown) =>
    typeof left === 'string' || typeof right === 'string'
      ? `${left}${right}`
      : Number(left) + Number(right)
  for (const row of rows) {
    totals.kcal = add(totals.kcal, row.calories || 0)
    totals.protein = add(totals.protein, row.protein || 0)
    totals.carbs = add(totals.carbs, row.carbs || 0)
    totals.fat = add(totals.fat, row.fat || 0)
  }
  return totals
}

function legacyGoals(profile: Record<string, unknown> | null) {
  return {
    kcal: profile?.calorie_goal || 2000,
    protein: profile?.protein_goal || 140,
    carbs: profile?.carbs_goal || 200,
    fat: profile?.fat_goal || 60,
  }
}

describe('NutritionTab C05 legacy characterization', () => {
  it('records the four hard-coded goal fallbacks', () => {
    expect(legacyGoals(null)).toEqual({
      kcal: 2000,
      protein: 140,
      carbs: 200,
      fat: 60,
    })
    expect(legacyGoals({
      calorie_goal: 0,
      protein_goal: null,
      carbs_goal: undefined,
      fat_goal: Number.NaN,
    })).toEqual({ kcal: 2000, protein: 140, carbs: 200, fat: 60 })
  })

  it('characterizes an empty day and real zeros as four zeros', () => {
    expect(legacyConsumption([])).toEqual({
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    })
    expect(legacyConsumption([
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })

  it('characterizes null, absent, empty and NaN macros as zeros', () => {
    expect(legacyConsumption([
      { calories: null, protein: undefined, carbs: '', fat: Number.NaN },
    ])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })

  it('characterizes strings, infinity and negatives', () => {
    expect(legacyConsumption([
      {
        calories: '120',
        protein: '15.5',
        carbs: Number.POSITIVE_INFINITY,
        fat: -2,
      },
    ])).toEqual({
      kcal: '0120',
      protein: '015.5',
      carbs: Number.POSITIVE_INFINITY,
      fat: -2,
    })
  })

  it('records that the hook owns selected-date errors and stale responses', () => {
    expect(journal).toContain('if (current !== requestId.current) return')
    expect(journal).toContain('return () => { requestId.current += 1 }')
    expect(journal).toContain("setState('error')")
  })
})
