import { z } from 'zod'
import { DAYS, MEAL_KEYS, MEAL_KEY_TO_TYPE, parseMealPlan } from '../meal-plan'
import { fitAthenaNutritionDayToTargets, validateAthenaNutritionDay } from '../athena/nutrition-output'
import { athenaNutritionRequestSchema } from '../athena/nutrition-input'
import { buildMealPlanParams } from '../meal-plan/build-generation-params'
import { createNutritionPlanContext, getNutritionPlanConsistency, NUTRITION_PLAN_CONTEXT_KEY } from '../nutrition/plan-context'
import type { Profile } from '../profile-service'

export class WeeklyAdjustmentError extends Error {
  constructor(readonly code: 'no_change' | 'unsupported_program' | 'plan_outdated' | 'invalid_adjustment') { super(code) }
}
const exerciseSchema = z.object({ sets: z.coerce.number().int().min(1).max(10) }).passthrough()
const daysSchema = z.array(z.object({
  is_rest: z.boolean().optional(), repos: z.boolean().optional(),
  exercises: z.array(z.record(z.string(), z.unknown())).max(20).optional(),
}).passthrough()).length(7)

/** Preserve exercises, equipment, loads, reps, timed holds, rest and calendar slots. */
export function adjustTrainingSets(input: unknown, deltaPct: number) {
  if (!Number.isFinite(deltaPct) || deltaPct === 0 || Math.abs(deltaPct) > 20) throw new WeeklyAdjustmentError('invalid_adjustment')
  const parsed = daysSchema.safeParse(input)
  if (!parsed.success) throw new WeeklyAdjustmentError('unsupported_program')
  const days = structuredClone(parsed.data)
  const entries: { exercise: Record<string, unknown>; before: number; after: number }[] = []
  for (const day of days) {
    if (day.is_rest || day.repos) continue
    for (const exercise of day.exercises ?? []) {
      // Do not adapt ambiguous/warm-up prescriptions as working volume.
      if (exercise.is_warmup || exercise.warmup) continue
      const checked = exerciseSchema.safeParse(exercise)
      if (!checked.success) throw new WeeklyAdjustmentError('unsupported_program')
      entries.push({ exercise, before: checked.data.sets, after: checked.data.sets })
    }
  }
  const before = entries.reduce((sum, ex) => sum + ex.before, 0)
  const maximum = Math.floor(before * 0.2)
  const change = Math.sign(deltaPct) * Math.min(maximum, Math.round(Math.abs(before * deltaPct / 100)))
  if (!change) throw new WeeklyAdjustmentError('no_change')
  const sign = Math.sign(change)
  for (let i = 0; i < Math.abs(change); i++) {
    const available = entries.filter(ex => sign > 0 ? ex.after < 10 : ex.after > 1)
    // Largest residual apportions integer sets across the existing prescriptions.
    available.sort((a, b) => sign * ((b.before * (1 + deltaPct / 100) - b.after) - (a.before * (1 + deltaPct / 100) - a.after)))
    if (!available[0]) throw new WeeklyAdjustmentError('no_change')
    available[0].after += sign
  }
  for (const entry of entries) entry.exercise.sets = entry.after
  const after = entries.reduce((sum, ex) => sum + ex.after, 0)
  return { days, before, after, requestedPct: deltaPct, actualPct: Math.round((after - before) / before * 1000) / 10 }
}

export function countPlannedSessions(days: unknown): number | null {
  const parsed = daysSchema.safeParse(days)
  return parsed.success ? parsed.data.filter(day => !day.is_rest && !day.repos && (day.exercises?.length ?? 0) > 0).length : null
}

export type WeeklyAdjustments = {
  calorie_goal_new?: number; protein_goal_new?: number; carbs_goal_new?: number; fat_goal_new?: number;
  training_volume_delta_pct?: number
}
export type ProgramBaseline = { id: string; days: unknown; phases?: unknown }

/** Small weekly nutrition adjustments retain all foods and meal slots; only portions change. */
export function prepareWeeklyAdjustment(profile: Profile, program: ProgramBaseline | null,
  mealPlan: { id: string; plan_data: unknown } | null, adjustment: WeeklyAdjustments) {
  if (adjustment.calorie_goal_new !== undefined) {
    if (adjustment.training_volume_delta_pct || !Number.isFinite(adjustment.calorie_goal_new)
      || Math.abs(adjustment.calorie_goal_new - Number(profile.calorie_goal)) > 150) throw new WeeklyAdjustmentError('invalid_adjustment')
    if (!mealPlan || getNutritionPlanConsistency(mealPlan.plan_data, profile) !== 'aligned') throw new WeeklyAdjustmentError('plan_outdated')
    const targets = { calorie_goal: adjustment.calorie_goal_new, protein_goal: adjustment.protein_goal_new,
      carbs_goal: adjustment.carbs_goal_new, fat_goal: adjustment.fat_goal_new }
    if (Object.values(targets).some(value => typeof value !== 'number' || !Number.isFinite(value))) throw new WeeklyAdjustmentError('invalid_adjustment')
    const params = athenaNutritionRequestSchema.parse(buildMealPlanParams(profile, targets))
    if (Object.entries(targets).some(([key, value]) => params[key as keyof typeof targets] !== value)) throw new WeeklyAdjustmentError('invalid_adjustment')
    const parsed = parseMealPlan(mealPlan.plan_data)
    const plan: Record<string, unknown> = {}
    for (const day of DAYS) {
      const original = parsed[day]
      if (!original || original.meals.length !== 4 || new Set(original.meals.map(m => m.type)).size !== 4) throw new WeeklyAdjustmentError('plan_outdated')
      const legacy = { repas: Object.fromEntries(MEAL_KEYS.map(key => [key,
        (original.meals.find(meal => meal.type === MEAL_KEY_TO_TYPE[key])?.foods ?? []).map(food => ({
          aliment: food.name, quantite_g: food.qty, kcal: food.kcal, proteines: food.prot, glucides: food.carb, lipides: food.fat,
        })),
      ])) }
      const nutritionalTargets = { calorieGoal: params.calorie_goal, proteinGoal: params.protein_goal,
        carbsGoal: params.carbs_goal, fatGoal: params.fat_goal, allergies: params.allergies }
      const verified = validateAthenaNutritionDay(fitAthenaNutritionDayToTargets(legacy, nutritionalTargets), nutritionalTargets)
      plan[day] = parseMealPlan({ [day]: verified })[day]
    }
    plan[NUTRITION_PLAN_CONTEXT_KEY] = createNutritionPlanContext(params)
    return { domain: 'nutrition' as const, plan, days: null,
      changes: { mealPlanId: mealPlan.id, targets, beforeTargets: { calorie_goal: profile.calorie_goal, protein_goal: profile.protein_goal,
        carbs_goal: profile.carbs_goal, fat_goal: profile.fat_goal } } }
  }
  if (!program || (Array.isArray(program.phases) && program.phases.length > 0)
    || (program.phases && !Array.isArray(program.phases))) throw new WeeklyAdjustmentError('unsupported_program')
  const training = adjustTrainingSets(program.days, adjustment.training_volume_delta_pct ?? 0)
  return { domain: 'training' as const, plan: null, days: training.days,
    changes: { programId: program.id, setsBefore: training.before, setsAfter: training.after,
      requestedPct: training.requestedPct, actualPct: training.actualPct } }
}
