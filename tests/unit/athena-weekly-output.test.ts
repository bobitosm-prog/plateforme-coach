import { describe, expect, it } from 'vitest'
import { validateAthenaWeeklyOutput } from '@/lib/athena/weekly-output'

const output = { points_forts: ['Deux séances terminées'], points_alerte: [], ajustements: { calorie_goal_new: 2100, training_volume_delta_pct: 10 }, objectif_semaine_prochaine: 'Journaliser cinq jours', raisonnement: 'Données partielles, priorité à la régularité.' }

describe('Athena weekly output', () => {
  it('derives the adherence and coverage indicator deterministically', () => expect(validateAthenaWeeklyOutput(output, { adherencePct: 50, nutritionDays: 7, weightMeasurements: 3, completedSessions: 2, plannedSessions: 4 }).score_semaine).toBe(65))
  it('removes nutrition changes without sufficient coverage', () => expect(validateAthenaWeeklyOutput(output, { adherencePct: 50, nutritionDays: 2, weightMeasurements: 1, completedSessions: 2, plannedSessions: 4 }).ajustements).not.toHaveProperty('calorie_goal_new'))
  it('removes training changes without repeated sessions', () => expect(validateAthenaWeeklyOutput(output, { adherencePct: 25, nutritionDays: 7, weightMeasurements: 3, completedSessions: 1, plannedSessions: 4 }).ajustements).not.toHaveProperty('training_volume_delta_pct'))
  it('never invents an exercise from aggregate evidence', () => expect(validateAthenaWeeklyOutput(output, { adherencePct: 50, nutritionDays: 7, weightMeasurements: 3, completedSessions: 2, plannedSessions: 4 }).exercice_a_ajouter).toBe(''))
  it('rejects unbounded output', () => expect(() => validateAthenaWeeklyOutput({ ...output, raisonnement: 'x'.repeat(1000) }, { adherencePct: 0, nutritionDays: 0, weightMeasurements: 0, completedSessions: 0, plannedSessions: 4 })).toThrow(/non conforme/))
})
