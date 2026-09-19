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
  gluten: ['blé', 'ble', 'orge', 'seigle', 'épeautre', 'epeautre', 'pain', 'pâtes', 'pates', 'avoine', 'seitan', 'semoule'],
  // Conservative exclusions: the generic catalogue has no certified lactose
  // content. This does NOT equate lactose intolerance with milk allergy.
  lactose: ['lait', 'yaourt', 'fromage', 'whey', 'caséine', 'skyr', 'cottage cheese', 'mozzarella', 'feta', 'parmesan'],
  milk: ['lait', 'yaourt', 'fromage', 'whey', 'caséine', 'skyr', 'cottage cheese', 'mozzarella', 'feta', 'parmesan'],
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

function fold(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/œ/g, 'oe') }
function containsTerm(value: string, term: string): boolean {
  const words = (input: string) => input.replace(/[^a-z0-9]+/g, ' ').trim()
  const normalizedTerm = words(fold(term))
  const normalizedValue = ` ${words(fold(value))} `
  // Match whole terms and French regular plurals, never arbitrary substrings.
  return [normalizedTerm, `${normalizedTerm}s`].some(candidate => normalizedValue.includes(` ${candidate} `))
}

export function canonicalizeAthenaNutritionDay(value: unknown, allergies: readonly string[]) {
  const parsed = daySchema.safeParse(value)
  if (!parsed.success) throw new AthenaNutritionOutputError('shape')
  const foods = Object.values(parsed.data.repas).flat()
  const forbidden = allergies.flatMap(item => ALLERGEN_TERMS[fold(item).trim()] ?? [item]).map(fold).filter(Boolean)
  if (foods.some(food => forbidden.some(term => containsTerm(food.aliment, term)))) throw new AthenaNutritionOutputError('allergen')
  const checkedMeals = Object.fromEntries(Object.entries(parsed.data.repas).map(([meal, entries]) => [
    meal,
    entries.map(food => {
      const reference = resolveFitnessFood(food.aliment)
      if (!reference) throw new AthenaNutritionOutputError('unknown_food')
      // Exact canonical match avoids confusing peanut butter with dairy butter.
      if (reference.name === 'Beurre' && allergies.some(item => ['milk', 'lactose'].includes(fold(item).trim()))) {
        throw new AthenaNutritionOutputError('allergen')
      }
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

type CanonicalDay = ReturnType<typeof canonicalizeAthenaNutritionDay>

function targetError(
  totals: { kcal: number; protein: number; carbs: number; fat: number },
  targets: NutritionTargets,
): number {
  const terms = [
    [totals.kcal, targets.calorieGoal, Math.max(targets.calorieGoal * 0.08, 100)],
    [totals.protein, targets.proteinGoal, Math.max(targets.proteinGoal * 0.15, 15)],
    [totals.carbs, targets.carbsGoal, Math.max(targets.carbsGoal * 0.15, 20)],
    [totals.fat, targets.fatGoal, Math.max(targets.fatGoal * 0.15, 8)],
  ]
  return terms.reduce((sum, [actual, target, tolerance]) => sum + ((actual - target) / tolerance) ** 2, 0)
}

/**
 * Adjusts only quantities selected by Athena. The food names, meal placement,
 * allergen checks and reference nutrition remain authoritative. This turns a
 * plausible menu into a target-compliant one without trusting model arithmetic.
 */
export function fitAthenaNutritionDayToTargets(value: unknown, targets: NutritionTargets): CanonicalDay {
  const canonical = canonicalizeAthenaNutritionDay(value, targets.allergies)
  const entries = Object.values(canonical.repas).flat()
  const references = entries.map(entry => resolveFitnessFood(entry.aliment))
  if (references.some(reference => !reference)) throw new AthenaNutritionOutputError('unknown_food')

  const limits = references.map(reference => {
    if (reference?.category === 'fat') return { min: 5, max: 80 }
    if (reference?.category === 'protein') return { min: 25, max: 450 }
    if (reference?.category === 'starch') return { min: 25, max: 600 }
    return { min: 10, max: 500 }
  })
  const calorieScale = targets.calorieGoal / Math.max(1, entries.reduce((sum, entry) => sum + entry.kcal, 0))
  const quantities = entries.map((entry, index) => {
    const scaled = Math.round((entry.quantite_g * calorieScale) / 5) * 5
    return Math.max(limits[index].min, Math.min(limits[index].max, scaled))
  })

  const totalsFor = (values: number[]) => values.reduce((totals, quantity, index) => {
    const nutrition = nutritionForQuantity(references[index]!, quantity)
    totals.kcal += nutrition.calories
    totals.protein += nutrition.protein
    totals.carbs += nutrition.carbs
    totals.fat += nutrition.fat
    return totals
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  // The score is a convex quadratic over linear nutrient totals. Coordinate
  // descent on a 5 g grid is deterministic and cheap for a single day.
  for (let pass = 0; pass < 16; pass++) {
    let changed = false
    for (let index = 0; index < quantities.length; index++) {
      const previous = quantities[index]
      let bestQuantity = previous
      let bestError = targetError(totalsFor(quantities), targets)
      for (let quantity = limits[index].min; quantity <= limits[index].max; quantity += 5) {
        quantities[index] = quantity
        const error = targetError(totalsFor(quantities), targets)
        if (error + 1e-9 < bestError) {
          bestError = error
          bestQuantity = quantity
        }
      }
      quantities[index] = bestQuantity
      if (bestQuantity !== previous) changed = true
    }
    if (!changed) break
  }

  entries.forEach((entry, index) => {
    const nutrition = nutritionForQuantity(references[index]!, quantities[index])
    entry.quantite_g = quantities[index]
    entry.kcal = Math.round(nutrition.calories)
    entry.proteines = Math.round(nutrition.protein)
    entry.glucides = Math.round(nutrition.carbs)
    entry.lipides = Math.round(nutrition.fat)
  })
  return canonical
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
