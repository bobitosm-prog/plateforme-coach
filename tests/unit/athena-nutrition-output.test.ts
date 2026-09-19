import { describe, expect, it } from 'vitest'
import { AthenaNutritionOutputError, canonicalizeAthenaNutritionDay, fitAthenaNutritionDayToTargets, validateAthenaNutritionDay } from '@/lib/athena/nutrition-output'

const food = (aliment: string, quantite_g: number, kcal: number, proteines: number, glucides: number, lipides: number) => ({ aliment, quantite_g, kcal, proteines, glucides, lipides })
const day = () => ({ repas: {
  petit_dejeuner: [food("Flocons d'avoine secs", 100, 379, 13, 67, 7)],
  dejeuner: [food('Blanc de poulet cuit', 200, 330, 62, 0, 7.2), food('Riz basmati cuit', 300, 390, 8.1, 84, 0.9)],
  collation: [food('Banane', 200, 178, 2.2, 46, 0.6), food('Amandes', 50, 289.5, 10.5, 11, 25)],
  diner: [food('Lentilles cuites', 300, 348, 27, 60, 1.2), food("Huile d'olive", 10, 88.4, 0, 0, 10)],
} })
const targets = { calorieGoal: 2003, proteinGoal: 123, carbsGoal: 268, fatGoal: 52, allergies: [] }

describe('Athena nutrition output', () => {
  it.each([
    ['Seitan', 'gluten'], ['Semoule cuite', 'gluten'],
    ['Amandes', 'tree_nuts'], ['Crevettes cuites', 'shellfish'],
    ['Sardines en boîte au naturel', 'fish'], ['Skyr nature', 'lactose'],
    ['Cottage cheese', 'lactose'], ['Caséine (poudre)', 'milk'],
    ['Beurre', 'milk'], ['Beurre', 'lactose'], ['Œuf entier', 'eggs'],
  ])('rejects regression food %s for %s before fitting', (name, allergy) => {
    const value = day()
    value.repas.diner[0] = food(name, 100, 0, 0, 0, 0)
    expect(() => canonicalizeAthenaNutritionDay(value, [allergy])).toThrow(expect.objectContaining({ code: 'allergen' }))
  })
  it('does not treat peanut butter as dairy butter', () => {
    const value = day()
    value.repas.diner[0] = food('Beurre de cacahuète', 20, 0, 0, 0, 0)
    expect(() => canonicalizeAthenaNutritionDay(value, ['milk', 'lactose'])).not.toThrow()
  })
  it('normalizes allergy code casing and whitespace', () => {
    expect(() => canonicalizeAthenaNutritionDay(day(), [' TREE_NUTS '])).toThrow(expect.objectContaining({ code: 'allergen' }))
  })
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
  it('deterministically fits canonical quantities to coherent targets', () => {
    const badlyPortioned = day()
    for (const foods of Object.values(badlyPortioned.repas)) {
      for (const entry of foods) entry.quantite_g = Math.max(5, entry.quantite_g / 2)
    }
    const fitted = fitAthenaNutritionDayToTargets(badlyPortioned, targets)
    expect(() => validateAthenaNutritionDay(fitted, targets)).not.toThrow()
    expect(Object.values(fitted.repas).flat().every(entry => entry.quantite_g % 5 === 0)).toBe(true)
  })
  it('produces exactly the same fitted day on repeated runs', () => {
    expect(fitAthenaNutritionDayToTargets(day(), targets)).toEqual(fitAthenaNutritionDayToTargets(day(), targets))
  })
  it.each([
    { calorieGoal: 1800, proteinGoal: 150, carbsGoal: 180, fatGoal: 53, allergies: [] },
    { calorieGoal: 2265, proteinGoal: 150, carbsGoal: 278, fatGoal: 61, allergies: [] },
    { calorieGoal: 3000, proteinGoal: 160, carbsGoal: 390, fatGoal: 89, allergies: [] },
  ])('fits common coherent target bundles ($calorieGoal kcal)', target => {
    const fitted = fitAthenaNutritionDayToTargets(day(), target)
    expect(() => validateAthenaNutritionDay(fitted, target)).not.toThrow()
  })
})
