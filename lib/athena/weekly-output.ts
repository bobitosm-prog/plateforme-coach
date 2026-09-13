import { z } from 'zod'

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

export interface WeeklyEvidence { adherencePct: number; nutritionDays: number; weightMeasurements: number; completedSessions: number; plannedSessions: number }
export class AthenaWeeklyOutputError extends Error { constructor() { super('Diagnostic hebdomadaire non conforme'); this.name = 'AthenaWeeklyOutputError' } }

export function validateAthenaWeeklyOutput(value: unknown, evidence: WeeklyEvidence) {
  const parsed = outputSchema.safeParse(value)
  if (!parsed.success) throw new AthenaWeeklyOutputError()
  const adjustments = { ...parsed.data.ajustements }
  if (evidence.nutritionDays < 5 || evidence.weightMeasurements < 3) {
    delete adjustments.calorie_goal_new
    delete adjustments.protein_goal_new
    delete adjustments.carbs_goal_new
    delete adjustments.fat_goal_new
  }
  if (evidence.completedSessions < 2 || evidence.plannedSessions <= 0) delete adjustments.training_volume_delta_pct
  const coverage = Math.min(100, evidence.nutritionDays / 7 * 100)
  const score = Math.round(Math.max(0, Math.min(100, evidence.adherencePct * 0.7 + coverage * 0.3)))
  return { ...parsed.data, ajustements: adjustments, score_semaine: score, exercice_a_ajouter: '' }
}
