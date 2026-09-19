import { describe, expect, it } from 'vitest'
import { FITNESS_FOODS } from '@/lib/fitness-food-database'
import { canonicalizeAthenaNutritionDay, validateAthenaNutritionDay } from '@/lib/athena/nutrition-output'
import { NUTRITION_PROVIDER_OUTPUT_FORMAT, parseNutritionProviderOutput } from '@/lib/athena/nutrition-provider-output'

const complete = (value: unknown) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(value) }] })
const day = (name = 'Riz basmati cuit') => ({ repas: Object.fromEntries(
  ['petit_dejeuner', 'dejeuner', 'collation', 'diner'].map(key => [key, [{
    aliment: name, quantite_g: 100, kcal: 0, proteines: 0, glucides: 0, lipides: 0,
  }]]),
) })

describe('nutrition provider boundary', () => {
  it('uses the entire current catalogue as a closed vocabulary, not a copied list', () => {
    const names = NUTRITION_PROVIDER_OUTPUT_FORMAT.schema.$defs.food.properties.aliment.enum
    expect(names).toEqual(FITNESS_FOODS.map(food => food.name))
    expect(new Set(names).size).toBe(names.length)
    expect(names).not.toContain('Un aliment inventé')
  })
  it('requires the four meals and disallows extra object fields', () => {
    const schema = NUTRITION_PROVIDER_OUTPUT_FORMAT.schema
    expect(schema.additionalProperties).toBe(false)
    expect(schema.properties.repas.required).toEqual(['petit_dejeuner', 'dejeuner', 'collation', 'diner'])
    expect(schema.properties.repas.additionalProperties).toBe(false)
    expect(schema.$defs.food.additionalProperties).toBe(false)
  })
  it('reads the text block rather than assuming content[0] is text', () => {
    const response = complete(day())
    response.content.unshift({ type: 'thinking', text: 'not a menu' })
    expect(parseNutritionProviderOutput(response)).toEqual(day())
  })
  it.each(['max_tokens', 'refusal', 'tool_use', 'pause_turn', undefined])('rejects stop reason %s even with valid JSON', stop_reason => {
    expect(() => parseNutritionProviderOutput({ ...complete(day()), stop_reason })).toThrow('Nutrition provider response unavailable')
  })
  it.each([null, {}, { stop_reason: 'end_turn', content: [] }, { stop_reason: 'end_turn', content: [{ type: 'text', text: 1 }] }])('rejects a malformed provider response', value => {
    expect(() => parseNutritionProviderOutput(value)).toThrow('Nutrition provider response unavailable')
  })
  it('rejects ambiguous multiple text blocks', () => {
    const response = complete(day()); response.content.push(response.content[0])
    expect(() => parseNutritionProviderOutput(response)).toThrow()
  })
  it('does not salvage malformed JSON or markdown', () => {
    expect(() => parseNutritionProviderOutput({ stop_reason: 'end_turn', content: [{ type: 'text', text: '```json\n{}\n```' }] })).toThrow()
  })
  it('retains server-side rejection if the provider violates the vocabulary', () => {
    expect(() => canonicalizeAthenaNutritionDay(parseNutritionProviderOutput(complete(day('Aliment inventé'))), [])).toThrow()
  })
  it('keeps reference arithmetic and case normalization authoritative', () => {
    const parsed = parseNutritionProviderOutput(complete(day('RIZ BASMATI CUIT')))
    expect(canonicalizeAthenaNutritionDay(parsed, []).repas.dejeuner[0]).toMatchObject({ aliment: 'Riz basmati cuit', kcal: 130 })
  })
  it('does not bypass the existing allergen and macro checks', () => {
    expect(() => canonicalizeAthenaNutritionDay(parseNutritionProviderOutput(complete(day('Pain complet'))), ['gluten'])).toThrow()
    expect(() => validateAthenaNutritionDay(parseNutritionProviderOutput(complete(day())), {
      calorieGoal: 2500, proteinGoal: 150, carbsGoal: 300, fatGoal: 80, allergies: [],
    })).toThrow()
  })
})
