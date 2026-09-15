import { z } from 'zod'
import { nutritionForQuantity, resolveFitnessFood } from '@/lib/nutrition/food-reference'

const foodSchema = z.object({
  aliment: z.string().trim().min(1).max(120), quantite_g: z.number().positive().max(2000),
  kcal: z.number().nonnegative().max(5000), proteines: z.number().nonnegative().max(500),
  glucides: z.number().nonnegative().max(1000), lipides: z.number().nonnegative().max(500),
})
const foodsSchema = z.array(foodSchema).min(1).max(10)
const daySchema = z.object({
  repas: z.object({ petit_dejeuner: foodsSchema, dejeuner: foodsSchema, collation: foodsSchema, diner: foodsSchema }),
})

const ALLERGEN_TERMS: Record<string, string[]> = {
  gluten: ['blé', 'ble', 'orge', 'seigle', 'épeautre', 'epeautre', 'pain', 'pâtes', 'pates', 'avoine'], lactose: ['lait', 'yaourt', 'fromage', 'whey'],
  eggs: ['œuf', 'oeuf'], tree_nuts: ['amande', 'noix', 'noisette', 'pistache', 'cajou'], peanuts: ['cacahuète', 'cacahuete'],
  soy: ['soja', 'tofu', 'tempeh'], fish: ['poisson', 'saumon', 'thon', 'sardine', 'cabillaud'],
  shellfish: ['crevette', 'crabe', 'homard', 'moule'], sesame: ['sésame', 'sesame'],
}

export interface NutritionTargets { calorieGoal: number; proteinGoal: number; carbsGoal: number; fatGoal: number; allergies: readonly string[] }
export type AthenaNutritionOutputErrorCode = 'shape' | 'allergen' | 'unknown_food' | 'targets'
export class AthenaNutritionOutputError extends Error {
  constructor(readonly code: AthenaNutritionOutputErrorCode) {
    super('Plan nutritionnel non conforme au contrat Athena')
    this.name = 'AthenaNutritionOutputError'
  }
}

function fold(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }
function containsTerm(value: string, term: string): boolean {
  const words = (input: string) => input.replace(/[^a-z0-9]+/g, ' ').trim()
  return ` ${words(fold(value))} `.includes(` ${words(term)} `)
}

export function canonicalizeAthenaNutritionDay(value: unknown, allergies: readonly string[]) {
  const parsed = daySchema.safeParse(value)
  if (!parsed.success) throw new AthenaNutritionOutputError('shape')
  const foods = Object.values(parsed.data.repas).flat()
  const forbidden = allergies.flatMap(item => ALLERGEN_TERMS[item] ?? [item]).map(fold).filter(Boolean)
  if (foods.some(food => forbidden.some(term => containsTerm(food.aliment, term)))) throw new AthenaNutritionOutputError('allergen')
  const checkedMeals = Object.fromEntries(Object.entries(parsed.data.repas).map(([meal, entries]) => [
    meal,
    entries.map(food => {
      const reference = resolveFitnessFood(food.aliment)
      if (!reference) throw new AthenaNutritionOutputError('unknown_food')
      const referenceNutrition = nutritionForQuantity(reference, food.quantite_g)
      return {
        ...food,
        aliment: reference.name,
        kcal: Math.round(referenceNutrition.calories),
        proteines: Math.round(referenceNutrition.protein),
        glucides: Math.round(referenceNutrition.carbs),
        lipides: Math.round(referenceNutrition.fat),
      }
    }),
  ])) as typeof parsed.data.repas
  return { repas: checkedMeals }
}

export function validateAthenaNutritionDay(value: unknown, targets: NutritionTargets) {
  const canonical = canonicalizeAthenaNutritionDay(value, targets.allergies)
  const checkedMeals = canonical.repas
  const checkedFoods = Object.values(checkedMeals).flat()
  const totals = checkedFoods.reduce((sum, food) => ({
    kcal: sum.kcal + food.kcal, protein: sum.protein + food.proteines,
    carbs: sum.carbs + food.glucides, fat: sum.fat + food.lipides,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
  const within = (actual: number, target: number, ratio: number, floor: number) => Math.abs(actual - target) <= Math.max(target * ratio, floor)
  if (!within(totals.kcal, targets.calorieGoal, 0.08, 100)
    || !within(totals.protein, targets.proteinGoal, 0.15, 15)
    || !within(totals.carbs, targets.carbsGoal, 0.15, 20)
    || !within(totals.fat, targets.fatGoal, 0.15, 8)) throw new AthenaNutritionOutputError('targets')
  return { repas: checkedMeals, total_kcal: Math.round(totals.kcal), total_protein: Math.round(totals.protein), total_carbs: Math.round(totals.carbs), total_fat: Math.round(totals.fat) }
}
