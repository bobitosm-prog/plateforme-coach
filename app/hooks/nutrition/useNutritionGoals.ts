'use client'

import { useMemo } from 'react'

export interface NutritionGoalSource {
  calorie_goal?: number | null
  protein_goal?: number | null
  carbs_goal?: number | null
  fat_goal?: number | null
}

export function resolveNutritionGoals(source: NutritionGoalSource | null | undefined) {
  const values = {
    calories: source?.calorie_goal ?? null,
    protein: source?.protein_goal ?? null,
    carbs: source?.carbs_goal ?? null,
    fat: source?.fat_goal ?? null,
  }
  const missing = Object.entries(values).filter(([, value]) => value === null).map(([key]) => key)
  return { values, complete: missing.length === 0, missing, state: missing.length === 4 ? 'empty' as const : 'ready' as const }
}

export function useNutritionGoals(source: NutritionGoalSource | null | undefined) {
  return useMemo(
    () => resolveNutritionGoals(source),
    [source],
  )
}
