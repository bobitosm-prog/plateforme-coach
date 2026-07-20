import { z } from 'zod'

const text = z.string().trim().min(1).max(5_000)

export const weeklyDiagnosticOutputSchema = z.object({
  score_semaine: z.number().finite().min(0).max(100),
  points_forts: z.array(text).min(1).max(3),
  points_alerte: z.array(text).max(2),
  ajustements: z.object({
    calorie_goal_new: z.number().int().nonnegative().optional(),
    protein_goal_new: z.number().int().nonnegative().optional(),
    carbs_goal_new: z.number().int().nonnegative().optional(),
    fat_goal_new: z.number().int().nonnegative().optional(),
    training_volume_delta_pct: z.number().int().finite().optional(),
  }).strict(),
  exercice_a_ajouter: z.string().trim().min(1).max(500),
  objectif_semaine_prochaine: text,
  raisonnement: text,
}).strict()

export type WeeklyDiagnosticOutput = z.infer<typeof weeklyDiagnosticOutputSchema>
