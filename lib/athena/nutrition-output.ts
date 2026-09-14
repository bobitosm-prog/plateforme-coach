import { z } from 'zod'
import { FITNESS_FOODS, type FitnessFood } from '@/lib/fitness-food-database'

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
export class AthenaNutritionOutputError extends Error { constructor() { super('Plan nutritionnel non conforme au contrat Athena'); this.name = 'AthenaNutritionOutputError' } }

function fold(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }
function containsTerm(value: string, term: string): boolean {
  const words = (input: string) => input.replace(/[^a-z0-9]+/g, ' ').trim()
  return ` ${words(fold(value))} `.includes(` ${words(term)} `)
}

const FOOD_BY_NAME = new Map(FITNESS_FOODS.map(food => [fold(food.name).trim(), food]))

function resolveReferenceFood(name: string): FitnessFood | null {
  return FOOD_BY_NAME.get(fold(name).trim()) ?? null
}

function referenceAmount(per100g: number, quantityG: number): number {
  return per100g * quantityG / 100
}

function closeToReference(actual: number, expected: number, floor: number): boolean {
  return Math.abs(actual - expected) <= Math.max(floor, expected * 0.05)
}

export function validateAthenaNutritionDay(value: unknown, targets: NutritionTargets) {
  const parsed = daySchema.safeParse(value)
  if (!parsed.success) throw new AthenaNutritionOutputError()
  const foods = Object.values(parsed.data.repas).flat()
  const forbidden = targets.allergies.flatMap(item => ALLERGEN_TERMS[item] ?? [item]).map(fold).filter(Boolean)
  if (foods.some(food => forbidden.some(term => containsTerm(food.aliment, term)))) throw new AthenaNutritionOutputError()
  const checkedMeals = Object.fromEntries(Object.entries(parsed.data.repas).map(([meal, entries]) => [
    meal,
    entries.map(food => {
      const reference = resolveReferenceFood(food.aliment)
      if (!reference) throw new AthenaNutritionOutputError()
      const expected = {
        kcal: referenceAmount(reference.kcal, food.quantite_g),
        proteines: referenceAmount(reference.prot, food.quantite_g),
        glucides: referenceAmount(reference.carb, food.quantite_g),
        lipides: referenceAmount(reference.fat, food.quantite_g),
      }
      if (!closeToReference(food.kcal, expected.kcal, 5)
        || !closeToReference(food.proteines, expected.proteines, 2)
        || !closeToReference(food.glucides, expected.glucides, 2)
        || !closeToReference(food.lipides, expected.lipides, 2)) throw new AthenaNutritionOutputError()
      return {
        ...food,
        aliment: reference.name,
        kcal: Math.round(expected.kcal),
        proteines: Math.round(expected.proteines),
        glucides: Math.round(expected.glucides),
        lipides: Math.round(expected.lipides),
      }
    }),
  ])) as typeof parsed.data.repas
  const checkedFoods = Object.values(checkedMeals).flat()
  const totals = checkedFoods.reduce((sum, food) => ({
    kcal: sum.kcal + food.kcal, protein: sum.protein + food.proteines,
    carbs: sum.carbs + food.glucides, fat: sum.fat + food.lipides,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
  const within = (actual: number, target: number, ratio: number, floor: number) => Math.abs(actual - target) <= Math.max(target * ratio, floor)
  if (!within(totals.kcal, targets.calorieGoal, 0.08, 100)
    || !within(totals.protein, targets.proteinGoal, 0.15, 15)
    || !within(totals.carbs, targets.carbsGoal, 0.15, 20)
    || !within(totals.fat, targets.fatGoal, 0.15, 8)) throw new AthenaNutritionOutputError()
  return { repas: checkedMeals, total_kcal: Math.round(totals.kcal), total_protein: Math.round(totals.protein), total_carbs: Math.round(totals.carbs), total_fat: Math.round(totals.fat) }
}
