import { describe, expect, it } from 'vitest'
import { calculateWeeklyExecutionScore, validateAthenaWeeklyOutput, type WeeklyEvidence } from '@/lib/athena/weekly-output'

const output = { points_forts: ['Deux séances terminées'], points_alerte: [], ajustements: { calorie_goal_new: 2100, training_volume_delta_pct: 10 }, objectif_semaine_prochaine: 'Journaliser cinq jours', raisonnement: 'Données partielles, priorité à la régularité.' }
const evidence: WeeklyEvidence = { adherencePct: 50, nutritionDays: 7, calorieCompliancePct: 100, proteinCompliancePct: 100, weightMeasurements: 3, completedSessions: 2, plannedSessions: 4 }

describe('Athena weekly output', () => {
  it('derives a deterministic execution score from training, logging, calories and protein', () => expect(validateAthenaWeeklyOutput(output, evidence).score_semaine).toBe(75))
  it('reduces the score when calorie or protein execution drifts', () => expect(calculateWeeklyExecutionScore({ ...evidence, calorieCompliancePct: 70, proteinCompliancePct: 60 })).toBe(65))
  it('does not award nutrition compliance without nutrition evidence', () => expect(calculateWeeklyExecutionScore({ ...evidence, nutritionDays: 0, calorieCompliancePct: null, proteinCompliancePct: null })).toBe(25))
  it('removes nutrition changes without sufficient coverage', () => expect(validateAthenaWeeklyOutput(output, { ...evidence, nutritionDays: 2, weightMeasurements: 1 }).ajustements).not.toHaveProperty('calorie_goal_new'))
  it('removes training changes without repeated sessions', () => expect(validateAthenaWeeklyOutput(output, { ...evidence, adherencePct: 25, completedSessions: 1 }).ajustements).not.toHaveProperty('training_volume_delta_pct'))
  it('never invents an exercise from aggregate evidence', () => expect(validateAthenaWeeklyOutput(output, evidence).exercice_a_ajouter).toBe(''))
  it('rejects unbounded output', () => expect(() => validateAthenaWeeklyOutput({ ...output, raisonnement: 'x'.repeat(1000) }, { ...evidence, adherencePct: 0, nutritionDays: 0, completedSessions: 0 })).toThrow(/non conforme/))
})
