import { z } from 'zod'

import {
  NUTRITION_PLAN_DAY_KEYS,
  NUTRITION_PLAN_MAX_BYTES,
  type NutritionPlanEnvelopeV1,
} from './types'

const boundedText = z.string().min(1).max(256)
const observedAlias = z.enum([
  'qty',
  'quantite_g',
  'quantity_g',
  'kcal',
  'calories',
  'prot',
  'proteines',
  'protein',
  'proteins',
  'carb',
  'glucides',
  'carbs',
  'fat',
  'lipides',
  'fats',
  'fiber',
  'fibers',
  'fibres',
])
const nullableNutrient = z.number().finite().nonnegative().nullable()
const nutritionValuesSchema = z.strictObject({
  energyKcal: nullableNutrient,
  proteinG: nullableNutrient,
  carbsG: nullableNutrient,
  fatG: nullableNutrient,
  fiberG: nullableNutrient,
})
const knownTargetSchema = z.strictObject({
  status: z.literal('known'),
  value: z.number().finite().nonnegative(),
  provenance: z.enum(['declared', 'generated', 'imported', 'legacy_unknown']),
})
const unknownTargetSchema = z.strictObject({
  status: z.enum(['unknown', 'not_applicable']),
  value: z.null(),
  provenance: z.enum(['declared', 'generated', 'imported', 'legacy_unknown']),
})
const targetSchema = z.discriminatedUnion('status', [knownTargetSchema, unknownTargetSchema])
const itemSchema = z.strictObject({
  id: boundedText,
  kind: z.literal('food'),
  label: boundedText,
  quantity: z.strictObject({
    grams: z.number().finite().positive().nullable(),
    original: z.union([z.string().max(128), z.number().finite().nonnegative(), z.null()]),
  }),
  nutrition: nutritionValuesSchema,
  observedAliases: z.array(observedAlias).max(16),
})
const mealSchema = z.strictObject({
  id: boundedText,
  type: boundedText,
  items: z.array(itemSchema).max(64),
})
const daySchema = z.strictObject({
  day: z.enum(NUTRITION_PLAN_DAY_KEYS),
  sourceStatus: z.enum(['observed', 'missing', 'omitted_legacy']),
  meals: z.array(mealSchema).max(12),
  declaredTotals: nutritionValuesSchema.nullable(),
})
const totalSchema = nutritionValuesSchema
const isoInstant = z.string().datetime({ offset: true }).max(64).nullable()

function isIanaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format(0)
    return true
  } catch {
    return false
  }
}

function utf8Bytes(value: string): number {
  let bytes = 0
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4
  }
  return bytes
}

export function serializedNutritionPlanBytes(value: unknown): number | null {
  try {
    const serialized = JSON.stringify(value)
    return serialized === undefined ? null : utf8Bytes(serialized)
  } catch {
    return null
  }
}

export const nutritionPlanEnvelopeV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  documentType: z.literal('nutrition_plan'),
  planVersion: z.number().int().positive(),
  timezone: z.string().max(128).refine(isIanaTimezone).nullable(),
  content: z.strictObject({
    days: z.array(daySchema).length(7).superRefine((days, context) => {
      days.forEach((day, index) => {
        if (day.day !== NUTRITION_PLAN_DAY_KEYS[index]) {
          context.addIssue({ code: 'custom', path: [index, 'day'], message: 'day_order' })
        }
      })
    }),
    rules: z.array(boundedText).max(128),
    alternatives: z.array(boundedText).max(16),
  }),
  targets: z.strictObject({
    energyKcal: targetSchema,
    proteinG: targetSchema,
    carbsG: targetSchema,
    fatG: targetSchema,
    fiberG: targetSchema,
  }),
  totals: z.strictObject({
    declared: totalSchema.nullable(),
    calculated: totalSchema.nullable(),
    calculationStatus: z.enum(['complete', 'partial', 'unavailable', 'invalid']),
    calculationVersion: z.string().min(1).max(128).nullable(),
    calculatedAt: isoInstant,
  }),
  provenance: z.strictObject({
    source: z.enum(['user', 'coach', 'ai', 'import', 'platform', 'legacy']),
    sourceVersion: z.string().min(1).max(128).nullable(),
    legacyFormat: z.string().min(1).max(128).nullable(),
    generatedAt: isoInstant,
  }),
  warnings: z.array(z.enum([
    'legacy_format',
    'legacy_duplicate_source',
    'legacy_day_missing',
    'legacy_coach_day_omitted',
    'legacy_ai_empty_day',
    'legacy_total_without_provenance',
    'activation_alias_present',
  ])).max(128),
}).superRefine((value, context) => {
  const bytes = serializedNutritionPlanBytes(value)
  if (bytes === null || bytes > NUTRITION_PLAN_MAX_BYTES) {
    context.addIssue({ code: 'custom', path: [], message: 'document_too_large' })
  }
})

export type NutritionPlanEnvelopeInput = z.input<typeof nutritionPlanEnvelopeV1Schema>

export function validateNutritionPlanEnvelope(value: unknown) {
  return nutritionPlanEnvelopeV1Schema.safeParse(value)
}

export function parseNutritionPlanEnvelope(value: unknown): NutritionPlanEnvelopeV1 | null {
  const parsed = validateNutritionPlanEnvelope(value)
  return parsed.success ? parsed.data : null
}

export function serializeNutritionPlanEnvelope(value: NutritionPlanEnvelopeV1): string | null {
  const parsed = parseNutritionPlanEnvelope(value)
  return parsed ? JSON.stringify(parsed) : null
}
