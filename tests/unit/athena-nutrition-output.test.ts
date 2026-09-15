import { describe, expect, it } from 'vitest'
import { AthenaNutritionOutputError, canonicalizeAthenaNutritionDay, validateAthenaNutritionDay } from '@/lib/athena/nutrition-output'

const food = (aliment: string, quantite_g: number, kcal: number, proteines: number, glucides: number, lipides: number) => ({ aliment, quantite_g, kcal, proteines, glucides, lipides })
const day = () => ({ repas: {
  petit_dejeuner: [food("Flocons d'avoine secs", 100, 379, 13, 67, 7)],
  dejeuner: [food('Blanc de poulet cuit', 200, 330, 62, 0, 7.2), food('Riz basmati cuit', 300, 390, 8.1, 84, 0.9)],
  collation: [food('Banane', 200, 178, 2.2, 46, 0.6), food('Amandes', 50, 289.5, 10.5, 11, 25)],
  diner: [food('Lentilles cuites', 300, 348, 27, 60, 1.2), food("Huile d'olive", 10, 88.4, 0, 0, 10)],
} })
const targets = { calorieGoal: 2003, proteinGoal: 123, carbsGoal: 268, fatGoal: 52, allergies: [] }

describe('Athena nutrition output', () => {
  it('recomputes totals from reference foods and quantities', () => expect(validateAthenaNutritionDay(day(), targets).total_kcal).toBe(2003))
  it('rejects missing meals and empty foods', () => expect(() => validateAthenaNutritionDay({ repas: {} }, targets)).toThrow(/non conforme/))
  it('rejects invented self-consistent foods', () => { const value = day(); value.repas.diner[0] = food('Aliment inexistant', 300, 348, 27, 60, 1.2); expect(() => validateAthenaNutritionDay(value, targets)).toThrow(/non conforme/) })
  it('replaces model arithmetic with the canonical nutrition values', () => {
    const value = day()
    value.repas.diner[0] = food('Lentilles cuites', 300, 50, 1, 1, 1)
    const result = validateAthenaNutritionDay(value, targets)
    expect(result.repas.diner[0]).toMatchObject({ kcal: 348, proteines: 27, glucides: 60, lipides: 1 })
    expect(result.total_kcal).toBe(2003)
  })
  it('canonicalizes safely before target validation', () => {
    const value = day()
    value.repas.dejeuner[0].kcal = 1
    expect(canonicalizeAthenaNutritionDay(value, []).repas.dejeuner[0]).toMatchObject({ kcal: 330, proteines: 62 })
  })
  it('rejects a declared allergen despite accents', () => { const value = day(); value.repas.petit_dejeuner[0] = food('Pain complet', 100, 247, 9, 41, 3.5); expect(() => validateAthenaNutritionDay(value, { ...targets, allergies: ['gluten'] })).toThrow(/non conforme/) })
  it('rejects fish foods for a fish allergy', () => { const value = day(); value.repas.diner[0] = food('Saumon cuit', 150, 312, 33, 0, 19.5); expect(() => validateAthenaNutritionDay(value, { ...targets, allergies: ['fish'] })).toThrow(/non conforme/) })
  it('does not confuse a non-dairy reference food with milk', () => { expect(() => validateAthenaNutritionDay(day(), { ...targets, allergies: ['lactose'] })).not.toThrow() })
  it('exposes only a non-sensitive rejection category', () => {
    try {
      validateAthenaNutritionDay(day(), { ...targets, calorieGoal: 4000 })
      throw new Error('expected validation failure')
    } catch (error) {
      expect(error).toBeInstanceOf(AthenaNutritionOutputError)
      expect((error as AthenaNutritionOutputError).code).toBe('targets')
      expect(error).not.toHaveProperty('cause')
    }
  })
})
