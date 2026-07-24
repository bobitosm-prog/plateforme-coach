import { describe, expect, it } from 'vitest'

import {
  adaptLegacyNutritionPlan,
  NUTRITION_PLAN_DAY_KEYS,
  NUTRITION_PLAN_MAX_BYTES,
  parseNutritionPlanEnvelope,
  readClientMealPlanRow,
  readMealPlanRow,
  readNutritionPlanDocument,
  serializeNutritionPlanEnvelope,
  serializedNutritionPlanBytes,
  validateNutritionPlanEnvelope,
} from '../../lib/nutrition/plan-envelope'
import {
  createNutritionPlanEnvelope,
  LEGACY_AI_WEEK,
  LEGACY_COACH_WEEK,
} from '../fixtures/nutrition-plan-envelope'

function clone<T>(value: T): T {
  return structuredClone(value)
}

describe('NutritionPlanEnvelopeV1 schema', () => {
  it('accepts a complete strict envelope and round-trips deterministically', () => {
    const envelope = createNutritionPlanEnvelope()
    expect(parseNutritionPlanEnvelope(envelope)).toEqual(envelope)
    const first = serializeNutritionPlanEnvelope(envelope)
    expect(first).not.toBeNull()
    expect(serializeNutritionPlanEnvelope(JSON.parse(first!))).toBe(first)
  })

  it('requires exactly seven ordered unique days', () => {
    const envelope = createNutritionPlanEnvelope()
    expect(envelope.content.days.map(day => day.day)).toEqual(NUTRITION_PLAN_DAY_KEYS)
    expect(parseNutritionPlanEnvelope({
      ...envelope,
      content: { ...envelope.content, days: envelope.content.days.slice(0, 6) },
    })).toBeNull()
    const reversed = [...envelope.content.days].reverse()
    expect(parseNutritionPlanEnvelope({
      ...envelope,
      content: { ...envelope.content, days: reversed },
    })).toBeNull()
    const duplicate = envelope.content.days.map((day, index) => index === 1 ? { ...day, day: 'monday' } : day)
    expect(parseNutritionPlanEnvelope({
      ...envelope,
      content: { ...envelope.content, days: duplicate },
    })).toBeNull()
  })

  it('validates IANA timezones without inventing one', () => {
    expect(parseNutritionPlanEnvelope(createNutritionPlanEnvelope({ timezone: 'Europe/Zurich' }))).not.toBeNull()
    expect(parseNutritionPlanEnvelope(createNutritionPlanEnvelope({ timezone: null }))).not.toBeNull()
    expect(parseNutritionPlanEnvelope(createNutritionPlanEnvelope({ timezone: 'Europe/Invalid' }))).toBeNull()
  })

  it('bounds meals, items, alternatives, and warnings', () => {
    const envelope = createNutritionPlanEnvelope()
    const item = {
      id: 'food',
      kind: 'food' as const,
      label: 'Riz',
      quantity: { grams: 100, original: 100 },
      nutrition: { energyKcal: 130, proteinG: 3, carbsG: 28, fatG: 1, fiberG: null },
      observedAliases: ['kcal'],
    }
    const meal = { id: 'meal', type: 'Déjeuner', items: Array.from({ length: 64 }, (_, index) => ({ ...item, id: `food-${index}` })) }
    const twelveMeals = Array.from({ length: 12 }, (_, index) => ({ ...meal, id: `meal-${index}` }))
    expect(parseNutritionPlanEnvelope({
      ...envelope,
      content: {
        ...envelope.content,
        days: envelope.content.days.map((day, index) => index === 0 ? { ...day, meals: twelveMeals } : day),
        alternatives: Array.from({ length: 16 }, (_, index) => `alternative-${index}`),
      },
    })).not.toBeNull()
    expect(parseNutritionPlanEnvelope({
      ...envelope,
      content: {
        ...envelope.content,
        days: envelope.content.days.map((day, index) => index === 0
          ? { ...day, meals: [...twelveMeals, { ...meal, id: 'meal-12' }] }
          : day),
      },
    })).toBeNull()
    expect(parseNutritionPlanEnvelope({
      ...envelope,
      content: {
        ...envelope.content,
        days: envelope.content.days.map((day, index) => index === 0
          ? { ...day, meals: [{ ...meal, items: [...meal.items, { ...item, id: 'food-64' }] }] }
          : day),
      },
    })).toBeNull()
    expect(parseNutritionPlanEnvelope({
      ...envelope,
      content: { ...envelope.content, alternatives: Array.from({ length: 17 }, (_, index) => `a-${index}`) },
    })).toBeNull()
    expect(parseNutritionPlanEnvelope({
      ...envelope,
      warnings: Array.from({ length: 129 }, () => 'legacy_format'),
    })).toBeNull()
  })

  it('measures the 1 MiB boundary in deterministic UTF-8 bytes', () => {
    const baseBytes = serializedNutritionPlanBytes({ payload: '' })!
    const under = { payload: 'x'.repeat(NUTRITION_PLAN_MAX_BYTES - baseBytes) }
    const over = { payload: `${under.payload}x` }
    expect(serializedNutritionPlanBytes(under)).toBe(NUTRITION_PLAN_MAX_BYTES)
    expect(serializedNutritionPlanBytes(over)).toBe(NUTRITION_PLAN_MAX_BYTES + 1)
    const envelope = createNutritionPlanEnvelope()
    const hugeItem = {
      id: 'food',
      kind: 'food' as const,
      label: 'x'.repeat(256),
      quantity: { grams: 100, original: 'x'.repeat(128) },
      nutrition: { energyKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
      observedAliases: Array.from({ length: 16 }, () => 'proteines'),
    }
    const hugeMeal = {
      id: 'meal',
      type: 'Déjeuner',
      items: Array.from({ length: 64 }, () => hugeItem),
    }
    const oversized = {
      ...envelope,
      content: {
        ...envelope.content,
        days: envelope.content.days.map(day => ({
          ...day,
          meals: Array.from({ length: 12 }, () => hugeMeal),
        })),
      },
    }
    expect(serializedNutritionPlanBytes(oversized)).toBeGreaterThan(NUTRITION_PLAN_MAX_BYTES)
    expect(parseNutritionPlanEnvelope(oversized)).toBeNull()
  })

  it('keeps declared and calculated divergent totals separate', () => {
    const envelope = createNutritionPlanEnvelope()
    const parsed = parseNutritionPlanEnvelope(envelope)!
    expect(parsed.totals.declared?.energyKcal).toBe(500)
    expect(parsed.totals.calculated?.energyKcal).toBe(490)
    const concordant = createNutritionPlanEnvelope({
      totals: {
        ...envelope.totals,
        calculated: envelope.totals.declared,
      },
    })
    expect(parseNutritionPlanEnvelope(concordant)?.totals.calculated)
      .toEqual(concordant.totals.declared)
  })

  it('distinguishes explicit zero from unknown', () => {
    const envelope = createNutritionPlanEnvelope({
      targets: {
        energyKcal: { status: 'known', value: 0, provenance: 'declared' },
        proteinG: { status: 'unknown', value: null, provenance: 'legacy_unknown' },
        carbsG: { status: 'unknown', value: null, provenance: 'legacy_unknown' },
        fatG: { status: 'unknown', value: null, provenance: 'legacy_unknown' },
        fiberG: { status: 'unknown', value: null, provenance: 'legacy_unknown' },
      },
    })
    expect(parseNutritionPlanEnvelope(envelope)?.targets.energyKcal.value).toBe(0)
    expect(parseNutritionPlanEnvelope(envelope)?.targets.proteinG.value).toBeNull()
  })

  it('rejects authority fields, unknown keys, and invalid numbers', () => {
    const envelope = createNutritionPlanEnvelope()
    for (const field of ['user_id', 'client_id', 'coach_id', 'owner', 'active', 'status']) {
      expect(parseNutritionPlanEnvelope({ ...envelope, [field]: 'forbidden' })).toBeNull()
    }
    expect(parseNutritionPlanEnvelope({ ...envelope, unexpected: true })).toBeNull()
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(parseNutritionPlanEnvelope({
        ...envelope,
        targets: {
          ...envelope.targets,
          energyKcal: { status: 'known', value, provenance: 'declared' },
        },
      })).toBeNull()
    }
  })
})

describe('Nutrition plan legacy adapters', () => {
  it('adapts the inventoried AI form and preserves empty AI days', () => {
    const result = adaptLegacyNutritionPlan(LEGACY_AI_WEEK)
    expect(result.status).toBe('legacy_converted')
    if (result.status !== 'legacy_converted') return
    expect(result.envelope.content.days[1]).toMatchObject({ sourceStatus: 'observed' })
    expect(result.envelope.content.days[1].meals).toHaveLength(4)
    expect(result.envelope.content.days[0].declaredTotals?.energyKcal).toBe(130)
    expect(result.envelope.totals.declared).toBeNull()
    expect(result.warnings).toContain('legacy_ai_empty_day')
    expect(result.envelope.content.days[0].meals[1].items[0].observedAliases)
      .toEqual(['quantite_g', 'kcal', 'proteines', 'glucides', 'lipides'])
  })

  it('adapts the inventoried coach form and preserves omitted coach days', () => {
    const result = adaptLegacyNutritionPlan(LEGACY_COACH_WEEK)
    expect(result.status).toBe('legacy_converted')
    if (result.status !== 'legacy_converted') return
    expect(result.envelope.content.days[1]).toEqual({
      day: 'tuesday',
      sourceStatus: 'omitted_legacy',
      meals: [],
      declaredTotals: null,
    })
    expect(result.warnings).toContain('legacy_coach_day_omitted')
  })

  it('fills a missing legacy day only with an explicit warning', () => {
    const partial = clone(LEGACY_COACH_WEEK) as Record<string, unknown>
    delete partial.dimanche
    const result = adaptLegacyNutritionPlan(partial)
    expect(result.status).toBe('legacy_converted')
    if (result.status !== 'legacy_converted') return
    expect(result.envelope.content.days[6]).toEqual({
      day: 'sunday',
      sourceStatus: 'missing',
      meals: [],
      declaredTotals: null,
    })
    expect(result.warnings).toContain('legacy_day_missing')
  })

  it('accepts identical aliases and rejects contradictory aliases', () => {
    const equal = clone(LEGACY_COACH_WEEK)
    const first = equal.lundi.meals[0].foods[0] as Record<string, unknown>
    first.protein = 3
    expect(adaptLegacyNutritionPlan(equal).status).toBe('legacy_converted')
    first.proteins = 4
    const conflict = adaptLegacyNutritionPlan(equal)
    expect(conflict).toEqual({
      status: 'conflict',
      issue: { code: 'alias_conflict', paths: ['days.0.meals.0.items.0.proteinG'] },
    })
  })

  it('refuses unobserved English days and malformed values', () => {
    expect(adaptLegacyNutritionPlan({ monday: { meals: [] } }).status).toBe('legacy_unsupported')
    const invalid = clone(LEGACY_COACH_WEEK)
    invalid.lundi.meals[0].foods[0].kcal = -1
    expect(adaptLegacyNutritionPlan(invalid).status).toBe('invalid')
  })
})

describe('Nutrition plan double reads and rows', () => {
  it('reads plan alone and plan_data alone', () => {
    expect(readNutritionPlanDocument({ plan: createNutritionPlanEnvelope() }).status).toBe('canonical')
    expect(readNutritionPlanDocument({ planData: LEGACY_COACH_WEEK }).status).toBe('legacy_converted')
  })

  it('accepts equivalent sources and refuses divergent sources', () => {
    const converted = adaptLegacyNutritionPlan(LEGACY_COACH_WEEK)
    expect(converted.status).toBe('legacy_converted')
    if (converted.status !== 'legacy_converted') return
    const equivalent = readNutritionPlanDocument({ plan: converted.envelope, planData: LEGACY_COACH_WEEK })
    expect(equivalent.status).toBe('canonical')
    if (equivalent.status === 'canonical') expect(equivalent.warnings).toContain('legacy_duplicate_source')
    expect(readNutritionPlanDocument({ plan: createNutritionPlanEnvelope(), planData: LEGACY_COACH_WEEK }).status)
      .toBe('conflict')
  })

  it('does not hide an invalid canonical plan with legacy data', () => {
    const result = readNutritionPlanDocument({
      plan: { ...createNutritionPlanEnvelope(), schemaVersion: 2 },
      planData: LEGACY_COACH_WEEK,
    })
    expect(result).toEqual({
      status: 'invalid',
      issue: { code: 'invalid_envelope', paths: ['plan'] },
    })
  })

  it('separates meal_plans SQL authority and detects activation conflicts', () => {
    const row = readMealPlanRow({
      id: 'plan-1',
      user_id: 'user-1',
      created_by: null,
      name: 'Plan',
      plan: createNutritionPlanEnvelope(),
      active: true,
      created_at: '2026-07-24T12:00:00.000Z',
    })
    expect(row.status).toBe('canonical')
    if (row.status === 'canonical') {
      expect(row.authority).toMatchObject({ userId: 'user-1', active: true })
      expect(row.envelope).not.toHaveProperty('user_id')
    }
    expect(readMealPlanRow({
      plan: createNutritionPlanEnvelope(),
      active: true,
      is_active: false,
    })).toMatchObject({ status: 'conflict', issue: { code: 'activation_conflict' } })
    const equal = readMealPlanRow({
      plan: createNutritionPlanEnvelope(),
      active: true,
      is_active: true,
    })
    expect(equal.status).toBe('canonical')
    if (equal.status === 'canonical') expect(equal.warnings).toContain('activation_alias_present')
  })

  it('reads a client assignment without copying coach/client authority', () => {
    const result = readClientMealPlanRow({
      id: 'assignment-1',
      client_id: 'client-1',
      coach_id: 'coach-1',
      plan: createNutritionPlanEnvelope(),
      created_at: '2026-07-24T12:00:00.000Z',
      updated_at: '2026-07-24T12:00:00.000Z',
    })
    expect(result.status).toBe('canonical')
    if (result.status !== 'canonical') return
    expect(result.authority).toMatchObject({ clientId: 'client-1', coachId: 'coach-1' })
    expect(result.envelope).not.toHaveProperty('client_id')
    expect(result.envelope).not.toHaveProperty('coach_id')
  })

  it('is deterministic, immutable, and expurgates errors', () => {
    const input = Object.freeze({ plan: Object.freeze({ secret: 'do-not-leak' }) })
    const before = JSON.stringify(input)
    const first = readNutritionPlanDocument(input)
    const second = readNutritionPlanDocument(input)
    expect(first).toEqual(second)
    expect(JSON.stringify(input)).toBe(before)
    expect(JSON.stringify(first)).not.toContain('do-not-leak')
    expect(validateNutritionPlanEnvelope(input.plan).success).toBe(false)
  })
})
