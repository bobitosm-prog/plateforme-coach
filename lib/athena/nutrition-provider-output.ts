import { FITNESS_FOODS } from '@/lib/fitness-food-database'

// Constrain vocabulary at generation time; the domain validator remains
// authoritative for quantities, reference nutrition, exclusions and totals.
const food = {
  type: 'object',
  properties: {
    aliment: { type: 'string', enum: FITNESS_FOODS.map(item => item.name) },
    quantite_g: { type: 'number' },
    kcal: { type: 'number' },
    proteines: { type: 'number' },
    glucides: { type: 'number' },
    lipides: { type: 'number' },
  },
  required: ['aliment', 'quantite_g', 'kcal', 'proteines', 'glucides', 'lipides'],
  additionalProperties: false,
}
const meal = { type: 'array', items: { $ref: '#/$defs/food' } }

export const NUTRITION_PROVIDER_OUTPUT_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    $defs: { food },
    properties: {
      total_kcal: { type: 'number' },
      total_protein: { type: 'number' },
      total_carbs: { type: 'number' },
      total_fat: { type: 'number' },
      repas: {
        type: 'object',
        properties: { petit_dejeuner: meal, dejeuner: meal, collation: meal, diner: meal },
        required: ['petit_dejeuner', 'dejeuner', 'collation', 'diner'],
        additionalProperties: false,
      },
    },
    required: ['total_kcal', 'total_protein', 'total_carbs', 'total_fat', 'repas'],
    additionalProperties: false,
  },
} as const

export class NutritionProviderOutputError extends Error {
  constructor(readonly code: 'provider_truncated' | 'provider_refusal' | 'provider_shape') {
    super('Nutrition provider response unavailable')
    this.name = 'NutritionProviderOutputError'
  }
}

/** Never accept a valid-looking prefix from a truncated or refused response. */
export function parseNutritionProviderOutput(value: unknown): unknown {
  if (!value || typeof value !== 'object') throw new NutritionProviderOutputError('provider_shape')
  const response = value as { stop_reason?: unknown; content?: unknown }
  if (response.stop_reason === 'max_tokens') throw new NutritionProviderOutputError('provider_truncated')
  if (response.stop_reason === 'refusal') throw new NutritionProviderOutputError('provider_refusal')
  if (response.stop_reason !== 'end_turn' || !Array.isArray(response.content)) {
    throw new NutritionProviderOutputError('provider_shape')
  }
  const texts = response.content.filter((block): block is { type: 'text'; text: string } => (
    !!block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string'
  ))
  if (texts.length !== 1) throw new NutritionProviderOutputError('provider_shape')
  return JSON.parse(texts[0].text)
}
