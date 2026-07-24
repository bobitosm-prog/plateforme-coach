import { describe, expect, it } from 'vitest'

import {
  presentNutritionPlanForLegacyUi,
  readLatestCoachMealPlan,
} from '@/lib/client-dashboard/coach-meal-plan-reader'
import { adaptLegacyNutritionPlan } from '@/lib/nutrition/plan-envelope'
import {
  createNutritionPlanEnvelope,
  LEGACY_COACH_WEEK,
} from '@/tests/fixtures/nutrition-plan-envelope'

describe('isolated dashboard coach meal-plan reader', () => {
  it('distinguishes an absent row from failures', () => {
    expect(readLatestCoachMealPlan({ ok: false, kind: 'not_found' })).toEqual({ status: 'absent' })
    expect(readLatestCoachMealPlan({
      ok: false,
      kind: 'failure',
      error: { kind: 'unavailable', contextCode: 'PGRST000' },
    })).toEqual({
      status: 'failure',
      error: { code: 'repository_failure', repositoryKind: 'unavailable' },
    })
  })

  it('preserves the exact legacy UI document and exposes an internal warning', () => {
    const result = readLatestCoachMealPlan({ ok: true, data: { plan: LEGACY_COACH_WEEK } })
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.source).toBe('legacy_converted')
    expect(result.plan).toBe(LEGACY_COACH_WEEK)
    expect(result.warnings).toContain('legacy_format')
  })

  it('presents a valid canonical document in the historical coach shape', () => {
    const legacy = adaptLegacyNutritionPlan(LEGACY_COACH_WEEK)
    expect(legacy.status).toBe('legacy_converted')
    if (legacy.status !== 'legacy_converted') return
    const canonical = {
      ...legacy.envelope,
      provenance: { ...legacy.envelope.provenance, source: 'coach' as const, legacyFormat: null },
      warnings: [],
    }
    const canonicalJson = JSON.parse(JSON.stringify(canonical))
    const result = readLatestCoachMealPlan({ ok: true, data: { plan: canonicalJson } })
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.source).toBe('canonical')
    expect(result.plan).toEqual(presentNutritionPlanForLegacyUi(canonical))
    expect(result.plan).toMatchObject({
      lundi: {
        meals: [{
          type: 'Déjeuner',
          foods: [{ name: 'Riz', qty: 100, kcal: 130, prot: 3, carb: 28, fat: 1 }],
        }],
      },
    })
  })

  it('fails closed on contradictory aliases', () => {
    const conflicting = structuredClone(LEGACY_COACH_WEEK)
    const conflictingFood = conflicting.lundi.meals[0].foods[0] as Record<string, unknown>
    conflictingFood.protein = 4
    expect(readLatestCoachMealPlan({ ok: true, data: { plan: conflicting } })).toEqual({
      status: 'conflict',
      error: { code: 'document_conflict' },
    })
  })

  it('distinguishes invalid and unsupported documents', () => {
    expect(readLatestCoachMealPlan({
      ok: true,
      data: { plan: JSON.parse(JSON.stringify({ ...createNutritionPlanEnvelope(), schemaVersion: 2 })) },
    })).toEqual({
      status: 'invalid',
      error: { code: 'invalid_document' },
    })
    expect(readLatestCoachMealPlan({
      ok: true,
      data: { plan: { monday: { meals: [] } } },
    })).toEqual({
      status: 'legacy_unsupported',
      error: { code: 'unsupported_legacy' },
    })
  })

  it('does not project an unknown required nutrient as zero', () => {
    const incomplete = structuredClone(LEGACY_COACH_WEEK)
    const incompleteFood = incomplete.lundi.meals[0].foods[0] as Record<string, unknown>
    delete incompleteFood.prot
    expect(readLatestCoachMealPlan({ ok: true, data: { plan: incomplete } })).toEqual({
      status: 'invalid',
      error: { code: 'incomplete_ui_projection' },
    })
  })

  it('is immutable, deterministic, and expurgates repository details', () => {
    const frozen = Object.freeze({ plan: LEGACY_COACH_WEEK })
    const first = readLatestCoachMealPlan({ ok: true, data: frozen })
    const second = readLatestCoachMealPlan({ ok: true, data: frozen })
    expect(first).toEqual(second)
    expect(frozen.plan).toBe(LEGACY_COACH_WEEK)
    const failure = readLatestCoachMealPlan({
      ok: false,
      kind: 'failure',
      error: { kind: 'unexpected', contextCode: 'PRIVATE' },
    })
    expect(JSON.stringify(failure)).not.toContain('PRIVATE')
  })
})
