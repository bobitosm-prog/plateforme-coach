import { describe, expect, it } from 'vitest'
import { validateAthenaNutritionDay } from '@/lib/athena/nutrition-output'

const food = (aliment: string, kcal = 500, proteines = 37.5, glucides = 62.5, lipides = 17.5) => ({ aliment, quantite_g: 200, kcal, proteines, glucides, lipides })
const day = () => ({ repas: { petit_dejeuner: [food('Avoine')], dejeuner: [food('Poulet riz')], collation: [food('Banane')], diner: [food('Lentilles')] } })
const targets = { calorieGoal: 2000, proteinGoal: 150, carbsGoal: 250, fatGoal: 70, allergies: [] }

describe('Athena nutrition output', () => {
  it('recomputes totals from foods', () => expect(validateAthenaNutritionDay(day(), targets).total_kcal).toBe(2000))
  it('rejects missing meals and empty foods', () => expect(() => validateAthenaNutritionDay({ repas: {} }, targets)).toThrow(/non conforme/))
  it('rejects invented totals outside target tolerance', () => { const value = day(); value.repas.diner[0].kcal = 50; expect(() => validateAthenaNutritionDay(value, targets)).toThrow(/non conforme/) })
  it('rejects a declared allergen despite accents', () => { const value = day(); value.repas.petit_dejeuner[0].aliment = 'Pain de blé'; expect(() => validateAthenaNutritionDay(value, { ...targets, allergies: ['gluten'] })).toThrow(/non conforme/) })
  it('rejects fish foods for a fish allergy', () => { const value = day(); value.repas.diner[0].aliment = 'Saumon'; expect(() => validateAthenaNutritionDay(value, { ...targets, allergies: ['fish'] })).toThrow(/non conforme/) })
  it('does not confuse lettuce with milk', () => { const value = day(); value.repas.petit_dejeuner[0].aliment = 'Laitue'; expect(() => validateAthenaNutritionDay(value, { ...targets, allergies: ['lactose'] })).not.toThrow() })
})
