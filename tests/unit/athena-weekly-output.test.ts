import { describe, expect, it } from 'vitest'
import { calculateWeeklyExecutionScore, validateAthenaWeeklyOutput, type WeeklyEvidence } from '@/lib/athena/weekly-output'

const output = { points_forts: ['Deux séances terminées'], points_alerte: [], ajustements: { calorie_goal_new: 2100, training_volume_delta_pct: 10 }, objectif_semaine_prochaine: 'Journaliser cinq jours', raisonnement: 'Données partielles, priorité à la régularité.' }
const evidence: WeeklyEvidence = {
  adherencePct: 50, nutritionDays: 7, calorieCompliancePct: 100, proteinCompliancePct: 100,
  weightMeasurements: 3, completedSessions: 2, plannedSessions: 4,
  currentCalorieGoal: 2200, tdeeKcal: 2600, currentWeightKg: 80,
  objective: 'cut', dietaryType: 'omnivore', hasPreviousDiagnostic: true,
}

describe('Athena weekly output', () => {
  it('derives a deterministic execution score from training, logging, calories and protein', () => expect(validateAthenaWeeklyOutput(output, evidence).score_semaine).toBe(75))
  it('reduces the score when calorie or protein execution drifts', () => expect(calculateWeeklyExecutionScore({ ...evidence, calorieCompliancePct: 70, proteinCompliancePct: 60 })).toBe(65))
  it('does not award nutrition compliance without nutrition evidence', () => expect(calculateWeeklyExecutionScore({ ...evidence, nutritionDays: 0, calorieCompliancePct: null, proteinCompliancePct: null })).toBe(25))
  it('removes nutrition changes without sufficient coverage', () => expect(validateAthenaWeeklyOutput(output, { ...evidence, nutritionDays: 2, weightMeasurements: 1 }).ajustements).not.toHaveProperty('calorie_goal_new'))
  it('removes training changes without repeated sessions', () => expect(validateAthenaWeeklyOutput(output, { ...evidence, adherencePct: 25, completedSessions: 1 }).ajustements).not.toHaveProperty('training_volume_delta_pct'))
  it('applies only one adjustment domain at a time and derives a coherent bundle', () => expect(validateAthenaWeeklyOutput(output, evidence).ajustements).toEqual({ calorie_goal_new: 2100, protein_goal_new: 176, carbs_goal_new: 205, fat_goal_new: 64 }))
  it('limits an automatic calorie change to 150 kcal per review', () => {
    const aggressive = { ...output, ajustements: { calorie_goal_new: 1200 } }
    expect(validateAthenaWeeklyOutput(aggressive, evidence).ajustements.calorie_goal_new).toBe(2050)
  })
  it('rejects calorie changes before a second complete weekly checkpoint', () => {
    expect(validateAthenaWeeklyOutput(output, { ...evidence, hasPreviousDiagnostic: false }).ajustements).not.toHaveProperty('calorie_goal_new')
    expect(validateAthenaWeeklyOutput(output, { ...evidence, nutritionDays: 6 }).ajustements).not.toHaveProperty('calorie_goal_new')
  })
  it('rejects an adjustment that contradicts the declared objective', () => {
    const gaining = { ...evidence, currentCalorieGoal: 2700, objective: 'mass' }
    expect(validateAthenaWeeklyOutput(output, gaining).ajustements).not.toHaveProperty('calorie_goal_new')
  })
  it('never invents an exercise from aggregate evidence', () => expect(validateAthenaWeeklyOutput(output, evidence).exercice_a_ajouter).toBe(''))
  it('rejects unbounded output', () => expect(() => validateAthenaWeeklyOutput({ ...output, raisonnement: 'x'.repeat(1000) }, { ...evidence, adherencePct: 0, nutritionDays: 0, completedSessions: 0 })).toThrow(/non conforme/))
})
