import { z } from 'zod'
import { calculateMacroTargetsForCalories, normalizeNutritionObjective } from '@/lib/nutrition/calorie-macro-targets'

const outputSchema = z.object({
  points_forts: z.array(z.string().trim().min(1).max(180)).max(3),
  points_alerte: z.array(z.string().trim().min(1).max(180)).max(2),
  ajustements: z.object({
    calorie_goal_new: z.number().int().min(1000).max(6000).optional(),
    protein_goal_new: z.number().int().min(20).max(400).optional(),
    carbs_goal_new: z.number().int().min(20).max(1000).optional(),
    fat_goal_new: z.number().int().min(20).max(300).optional(),
    training_volume_delta_pct: z.number().int().min(-20).max(20).optional(),
  }),
  objectif_semaine_prochaine: z.string().trim().min(1).max(240),
  raisonnement: z.string().trim().min(1).max(800),
})

export interface WeeklyEvidence {
  adherencePct: number
  nutritionDays: number
  calorieCompliancePct: number | null
  proteinCompliancePct: number | null
  weightMeasurements: number
  completedSessions: number
  plannedSessions: number
  currentCalorieGoal?: number | null
  tdeeKcal?: number | null
  currentWeightKg?: number | null
  objective?: string | null
  dietaryType?: string | null
  hasPreviousDiagnostic?: boolean
}
export class AthenaWeeklyOutputError extends Error { constructor() { super('Diagnostic hebdomadaire non conforme'); this.name = 'AthenaWeeklyOutputError' } }

function complianceScore(value: number | null): number {
  if (value === null || !Number.isFinite(value)) return 0
  return Math.max(0, 100 - Math.abs(100 - value))
}

export function calculateWeeklyExecutionScore(evidence: WeeklyEvidence): number {
  const training = Math.max(0, Math.min(100, evidence.adherencePct))
  const logging = Math.max(0, Math.min(100, evidence.nutritionDays / 7 * 100))
  const calorie = complianceScore(evidence.calorieCompliancePct)
  const protein = complianceScore(evidence.proteinCompliancePct)
  return Math.round(training * 0.5 + logging * 0.2 + calorie * 0.15 + protein * 0.15)
}

export function validateAthenaWeeklyOutput(value: unknown, evidence: WeeklyEvidence) {
  const parsed = outputSchema.safeParse(value)
  if (!parsed.success) throw new AthenaWeeklyOutputError()
  const adjustments = { ...parsed.data.ajustements }
  if (evidence.nutritionDays < 7 || evidence.weightMeasurements < 3 || !evidence.hasPreviousDiagnostic) {
    delete adjustments.calorie_goal_new
    delete adjustments.protein_goal_new
    delete adjustments.carbs_goal_new
    delete adjustments.fat_goal_new
  }
  const proposedCalories = adjustments.calorie_goal_new
  const currentCalories = Number(evidence.currentCalorieGoal)
  const weightKg = Number(evidence.currentWeightKg)
  if (proposedCalories !== undefined) {
    delete adjustments.protein_goal_new
    delete adjustments.carbs_goal_new
    delete adjustments.fat_goal_new
    if (!Number.isFinite(currentCalories) || currentCalories <= 0 || !Number.isFinite(weightKg) || weightKg <= 0) {
      delete adjustments.calorie_goal_new
    } else {
      const boundedCalories = Math.round(Math.max(
        currentCalories - 150,
        Math.min(currentCalories + 150, proposedCalories),
      ))
      const tdee = Number(evidence.tdeeKcal)
      const objective = normalizeNutritionObjective(evidence.objective)
      const wrongDirection = Number.isFinite(tdee) && tdee > 0 && (
        (objective === 'cut' && boundedCalories >= tdee)
        || (objective === 'mass' && boundedCalories <= tdee)
        || (objective === 'maintain' && Math.abs(boundedCalories - tdee) > 150)
      )
      if (wrongDirection || boundedCalories === currentCalories) {
        delete adjustments.calorie_goal_new
      } else {
        const macros = calculateMacroTargetsForCalories({
          targetCalories: boundedCalories,
          weightKg,
          objective,
          dietaryType: evidence.dietaryType,
        })
        adjustments.calorie_goal_new = boundedCalories
        adjustments.protein_goal_new = macros.proteinGrams
        adjustments.carbs_goal_new = macros.carbsGrams
        adjustments.fat_goal_new = macros.fatGrams
      }
    }
  } else {
    delete adjustments.protein_goal_new
    delete adjustments.carbs_goal_new
    delete adjustments.fat_goal_new
  }
  if (evidence.completedSessions < 2 || evidence.plannedSessions <= 0) delete adjustments.training_volume_delta_pct
  const hasNutritionAdjustment = adjustments.calorie_goal_new !== undefined
    || adjustments.protein_goal_new !== undefined
    || adjustments.carbs_goal_new !== undefined
    || adjustments.fat_goal_new !== undefined
  if (hasNutritionAdjustment) delete adjustments.training_volume_delta_pct
  const score = calculateWeeklyExecutionScore(evidence)
  return { ...parsed.data, ajustements: adjustments, score_semaine: score, exercice_a_ajouter: '' }
}
