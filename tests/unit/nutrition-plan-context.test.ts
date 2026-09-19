import { describe, expect, it } from 'vitest'
import { athenaNutritionRequestSchema } from '@/lib/athena/nutrition-input'
import { createNutritionPlanContext, getNutritionPlanConsistency } from '@/lib/nutrition/plan-context'
import { parseMealPlan } from '@/lib/meal-plan'

const targets = { calorie_goal: 2200, protein_goal: 150, carbs_goal: 250, fat_goal: 70 }
const context = createNutritionPlanContext(athenaNutritionRequestSchema.parse(targets))
const plan = { _nutrition_context: context, lundi: { meals: [{ type: 'Déjeuner', foods: [{ name: 'Banane', qty: 100, kcal: 89, prot: 1, carb: 23, fat: 0 }] }] } }
describe('nutrition plan context', () => {
  it('matches stored input targets, not approximate meal totals', () => {
    expect(getNutritionPlanConsistency(plan, targets)).toBe('aligned')
  })
  it.each([
    { calorie_goal: 2400 }, { protein_goal: 160 }, { carbs_goal: 280 }, { fat_goal: 80 },
    { dietary_type: 'vegan' }, { allergies: ['tree_nuts'] }, { objective: 'cut' },
    { meal_preferences: { dietary_restrictions: 'Sans lait' } },
    { meal_preferences: { disliked_foods: ['Banane'] } },
  ])('detects a changed saved input %j', changes => {
    expect(getNutritionPlanConsistency(plan, { ...targets, ...changes })).toBe('outdated')
  })
  it.each([null, {}, { _nutrition_context: { version: 2 } }, { _nutrition_context: { ...context, calorie_goal: '2200' } }])('does not invent provenance for legacy or malformed plans %j', value => {
    expect(getNutritionPlanConsistency(value, targets)).toBe('unknown')
  })
  it('does not invent missing or malformed profile values', () => {
    expect(getNutritionPlanConsistency(plan, null)).toBe('unknown')
    expect(getNutritionPlanConsistency(plan, { ...targets, fat_goal: null })).toBe('unknown')
    expect(getNutritionPlanConsistency(plan, { ...targets, allergies: ['gluten', 123] })).toBe('unknown')
  })
  it('ignores array ordering and cosmetic differences', () => {
    const request = athenaNutritionRequestSchema.parse({ ...targets, allergies: ['fish', 'gluten'], dietary_type: 'vegetarian', disliked_foods: ['Pomme'] })
    expect(getNutritionPlanConsistency({ _nutrition_context: createNutritionPlanContext(request) }, {
      ...targets, allergies: [' GLUTEN ', 'fish', 'fish'], dietary_type: 'Végétarien', meal_preferences: { disliked_foods: ['pomme'] },
    })).toBe('aligned')
  })
  it('keeps the existing day parser compatible and never treats metadata as a meal', () => {
    expect(Object.keys(parseMealPlan(plan))).toEqual(['lundi'])
    expect(parseMealPlan(plan).lundi!.meals[0].foods[0].name).toBe('Banane')
  })
  it('persists only explicit configuration fields, not profile identity or prompts', () => {
    const request = { ...athenaNutritionRequestSchema.parse(targets), full_name: 'Synthetic private name', prompt: 'private', apiKey: 'synthetic' }
    expect(Object.keys(createNutritionPlanContext(request))).toEqual([
      'version', 'calorie_goal', 'protein_goal', 'carbs_goal', 'fat_goal', 'dietary_type', 'objective_mode', 'allergies', 'dietary_restrictions', 'disliked_foods',
    ])
  })
})
