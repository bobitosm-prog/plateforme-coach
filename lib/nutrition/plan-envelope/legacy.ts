import {
  NUTRITION_PLAN_DAY_KEYS,
  type NutritionPlanDayKey,
  type NutritionPlanEnvelopeV1,
  type NutritionPlanItemV1,
  type NutritionPlanReadResult,
  type NutritionPlanTotalV1,
  type NutritionPlanWarningCode,
} from './types'
import { parseNutritionPlanEnvelope, serializedNutritionPlanBytes } from './schema'

const FRENCH_DAYS: Readonly<Record<string, NutritionPlanDayKey>> = {
  lundi: 'monday',
  mardi: 'tuesday',
  mercredi: 'wednesday',
  jeudi: 'thursday',
  vendredi: 'friday',
  samedi: 'saturday',
  dimanche: 'sunday',
}
const AI_MEALS = ['petit_dejeuner', 'dejeuner', 'collation', 'diner'] as const
const NUTRIENTS = {
  energyKcal: ['kcal', 'calories'],
  proteinG: ['prot', 'proteines', 'protein', 'proteins'],
  carbsG: ['carb', 'glucides', 'carbs'],
  fatG: ['fat', 'lipides', 'fats'],
  fiberG: ['fiber', 'fibers', 'fibres'],
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function issue(status: 'legacy_unsupported' | 'conflict' | 'invalid', code: 'unsupported_legacy' | 'alias_conflict' | 'invalid_envelope', paths: readonly string[]): NutritionPlanReadResult {
  return { status, issue: { code, paths } }
}

function readAliases(
  value: Record<string, unknown>,
  aliases: readonly string[],
  path: string,
): { readonly value: number | null; readonly observed: readonly string[] } | NutritionPlanReadResult {
  const observed = aliases.filter(alias => value[alias] !== undefined && value[alias] !== null)
  const numbers = observed.map(alias => value[alias])
  if (numbers.some(entry => typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0)) {
    return issue('invalid', 'invalid_envelope', [path])
  }
  if (new Set(numbers).size > 1) return issue('conflict', 'alias_conflict', [path])
  return { value: (numbers[0] as number | undefined) ?? null, observed }
}

function adaptItem(value: unknown, id: string, path: string): NutritionPlanItemV1 | NutritionPlanReadResult {
  if (!isRecord(value)) return issue('invalid', 'invalid_envelope', [path])
  const label = value.name ?? value.aliment
  if (typeof label !== 'string' || label.length === 0 || label.length > 256) {
    return issue('invalid', 'invalid_envelope', [`${path}.label`])
  }
  const quantityAliases = ['qty', 'quantite_g', 'quantity_g'] as const
  const quantity = readAliases(value, quantityAliases, `${path}.quantity`)
  if ('status' in quantity) return quantity
  const nutritionEntries = Object.entries(NUTRIENTS).map(([nutrient, aliases]) => {
    const resolved = readAliases(value, aliases, `${path}.${nutrient}`)
    return [nutrient, resolved] as const
  })
  const failure = nutritionEntries.find(([, resolved]) => 'status' in resolved)
  if (failure && 'status' in failure[1]) return failure[1]
  const nutrition = Object.fromEntries(nutritionEntries.map(([nutrient, resolved]) => [
    nutrient,
    'value' in resolved ? resolved.value : null,
  ])) as NutritionPlanItemV1['nutrition']
  const observedAliases = [
    ...quantity.observed,
    ...nutritionEntries.flatMap(([, resolved]) => 'observed' in resolved ? resolved.observed : []),
  ]
  const originalQuantity = quantity.observed.length > 0 ? value[quantity.observed[0]] : null
  return {
    id,
    kind: 'food',
    label,
    quantity: {
      grams: typeof quantity.value === 'number' && quantity.value > 0 ? quantity.value : null,
      original: typeof originalQuantity === 'string' || typeof originalQuantity === 'number' ? originalQuantity : null,
    },
    nutrition,
    observedAliases,
  }
}

function legacyTotal(day: Record<string, unknown>, path: string): NutritionPlanTotalV1 | NutritionPlanReadResult | null {
  const aliases = {
    energyKcal: ['total_kcal'],
    proteinG: ['total_protein'],
    carbsG: ['total_carbs'],
    fatG: ['total_fat'],
    fiberG: ['total_fiber'],
  } as const
  if (!Object.values(aliases).flat().some(alias => day[alias] !== undefined)) return null
  const entries = Object.entries(aliases).map(([nutrient, names]) => {
    const resolved = readAliases(day, names, `${path}.${nutrient}`)
    return [nutrient, resolved] as const
  })
  const failure = entries.find(([, resolved]) => 'status' in resolved)
  if (failure && 'status' in failure[1]) return failure[1]
  return Object.fromEntries(entries.map(([nutrient, resolved]) => [
    nutrient,
    'value' in resolved ? resolved.value : null,
  ])) as unknown as NutritionPlanTotalV1
}

function unknownTargets(): NutritionPlanEnvelopeV1['targets'] {
  const value = { status: 'unknown' as const, value: null, provenance: 'legacy_unknown' as const }
  return { energyKcal: value, proteinG: value, carbsG: value, fatG: value, fiberG: value }
}

export function adaptLegacyNutritionPlan(value: unknown): NutritionPlanReadResult {
  if (!isRecord(value)) return issue('legacy_unsupported', 'unsupported_legacy', ['document'])
  const keys = Object.keys(value)
  if (keys.length === 0 || keys.some(key => !(key in FRENCH_DAYS))) {
    return issue('legacy_unsupported', 'unsupported_legacy', ['document'])
  }
  const warnings: NutritionPlanWarningCode[] = ['legacy_format']
  const days: NutritionPlanEnvelopeV1['content']['days'][number][] = []
  for (const [index, dayKey] of NUTRITION_PLAN_DAY_KEYS.entries()) {
    const frenchKey = Object.keys(FRENCH_DAYS).find(key => FRENCH_DAYS[key] === dayKey)
    const rawDay = frenchKey ? value[frenchKey] : undefined
    if (rawDay === undefined) {
      warnings.push('legacy_day_missing')
      days.push({ day: dayKey, sourceStatus: 'missing', meals: [], declaredTotals: null })
      continue
    }
    if (!isRecord(rawDay)) return issue('invalid', 'invalid_envelope', [`days.${index}`])
    const total = legacyTotal(rawDay, `days.${index}.totals`)
    if (total && 'status' in total) return total
    if (total) {
      warnings.push('legacy_total_without_provenance')
    }
    if (Array.isArray(rawDay.meals)) {
      if (rawDay.meals.length === 0) {
        warnings.push('legacy_coach_day_omitted')
        days.push({ day: dayKey, sourceStatus: 'omitted_legacy', meals: [], declaredTotals: total })
        continue
      }
      if (rawDay.meals.length > 12) return issue('invalid', 'invalid_envelope', [`days.${index}.meals`])
      const meals = []
      for (const [mealIndex, rawMeal] of rawDay.meals.entries()) {
        if (!isRecord(rawMeal) || typeof rawMeal.type !== 'string' || !Array.isArray(rawMeal.foods)) {
          return issue('invalid', 'invalid_envelope', [`days.${index}.meals.${mealIndex}`])
        }
        const items = []
        for (const [itemIndex, rawItem] of rawMeal.foods.entries()) {
          const item = adaptItem(rawItem, `${dayKey}-${mealIndex}-${itemIndex}`, `days.${index}.meals.${mealIndex}.items.${itemIndex}`)
          if ('status' in item) return item
          items.push(item)
        }
        meals.push({ id: `${dayKey}-${mealIndex}`, type: rawMeal.type, items })
      }
      days.push({ day: dayKey, sourceStatus: 'observed', meals, declaredTotals: total })
      continue
    }
    if (isRecord(rawDay.repas)) {
      if (Object.keys(rawDay.repas).length === 0) warnings.push('legacy_ai_empty_day')
      const meals = []
      for (const [mealIndex, mealKey] of AI_MEALS.entries()) {
        const rawItems = rawDay.repas[mealKey]
        if (rawItems !== undefined && !Array.isArray(rawItems)) {
          return issue('invalid', 'invalid_envelope', [`days.${index}.meals.${mealIndex}`])
        }
        const items = []
        for (const [itemIndex, rawItem] of (rawItems ?? []).entries()) {
          const item = adaptItem(rawItem, `${dayKey}-${mealIndex}-${itemIndex}`, `days.${index}.meals.${mealIndex}.items.${itemIndex}`)
          if ('status' in item) return item
          items.push(item)
        }
        meals.push({ id: `${dayKey}-${mealIndex}`, type: mealKey, items })
      }
      days.push({ day: dayKey, sourceStatus: 'observed', meals, declaredTotals: total })
      continue
    }
    return issue('legacy_unsupported', 'unsupported_legacy', [`days.${index}`])
  }
  const envelope: NutritionPlanEnvelopeV1 = {
    schemaVersion: 1,
    documentType: 'nutrition_plan',
    planVersion: 1,
    timezone: null,
    content: { days, rules: [], alternatives: [] },
    targets: unknownTargets(),
    totals: {
      declared: null,
      calculated: null,
      calculationStatus: 'unavailable',
      calculationVersion: null,
      calculatedAt: null,
    },
    provenance: {
      source: 'legacy',
      sourceVersion: null,
      legacyFormat: 'meal_plan_week_v0',
      generatedAt: null,
    },
    warnings: [...new Set(warnings)],
  }
  if ((serializedNutritionPlanBytes(envelope) ?? Infinity) > 1024 * 1024) {
    return issue('invalid', 'invalid_envelope', ['document'])
  }
  const parsed = parseNutritionPlanEnvelope(envelope)
  return parsed
    ? { status: 'legacy_converted', envelope: parsed, warnings: parsed.warnings }
    : issue('invalid', 'invalid_envelope', ['document'])
}
