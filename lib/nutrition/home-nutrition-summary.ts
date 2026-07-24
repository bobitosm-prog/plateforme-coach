import type {
  ActivePersonalMealPlanReadResult,
} from '@/lib/nutrition/personal-meal-plan-reader'

const DAY_INDEX: Readonly<Record<string, number>> = {
  lundi: 0,
  mardi: 1,
  mercredi: 2,
  jeudi: 3,
  vendredi: 4,
  samedi: 5,
  dimanche: 6,
}

export interface HomeMealCompletion {
  readonly meal_type: string | null
}

export interface HomeCalorieLog {
  readonly calories: number | null
}

export type HomeNutritionSummaryResult =
  | {
    readonly status: 'ready'
    readonly consumedKcal: number
    readonly planSource: 'canonical' | 'legacy_converted'
  }
  | {
    readonly status: 'absent'
    readonly consumedKcal: number
  }
  | Extract<
    ActivePersonalMealPlanReadResult,
    { readonly status: 'conflict' | 'invalid' | 'legacy_unsupported' | 'failure' }
  >

function sumLogs(logs: readonly HomeCalorieLog[]): number | null {
  let total = 0
  for (const log of logs) {
    if (
      log.calories !== null &&
      (!Number.isFinite(log.calories) || log.calories < 0)
    ) return null
    total += log.calories ?? 0
  }
  return total
}

export function readHomeNutritionSummary(
  plan: ActivePersonalMealPlanReadResult,
  completions: readonly HomeMealCompletion[],
  logs: readonly HomeCalorieLog[],
  frenchDayKey: string,
): HomeNutritionSummaryResult {
  const loggedCalories = sumLogs(logs)
  if (loggedCalories === null) {
    return {
      status: 'invalid',
      error: { code: 'incomplete_ui_projection' },
    }
  }
  if (plan.status === 'absent') {
    return { status: 'absent', consumedKcal: loggedCalories }
  }
  if (plan.status !== 'ready') return plan

  const dayIndex = DAY_INDEX[frenchDayKey.toLowerCase()]
  const day = dayIndex === undefined ? undefined : plan.envelope.content.days[dayIndex]
  if (!day) {
    return {
      status: 'invalid',
      error: { code: 'incomplete_ui_projection' },
    }
  }

  const completedTypes = new Set(
    completions.flatMap(completion =>
      typeof completion.meal_type === 'string' ? [completion.meal_type] : []),
  )
  let planCalories = 0
  for (const meal of day.meals) {
    if (!completedTypes.has(meal.type)) continue
    for (const item of meal.items) {
      if (item.nutrition.energyKcal === null) {
        return {
          status: 'invalid',
          error: { code: 'incomplete_ui_projection' },
        }
      }
      planCalories += item.nutrition.energyKcal
    }
  }
  return {
    status: 'ready',
    consumedKcal: planCalories + loggedCalories,
    planSource: plan.source,
  }
}
