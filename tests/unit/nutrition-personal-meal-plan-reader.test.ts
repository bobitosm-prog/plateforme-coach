import { describe, expect, it, vi } from 'vitest'

import {
  createActivePersonalMealPlanReader,
  type ActivePersonalMealPlanPort,
} from '@/lib/nutrition/personal-meal-plan-reader'
import { adaptLegacyNutritionPlan } from '@/lib/nutrition/plan-envelope'
import type { PersonalMealPlanRow } from '@/lib/repositories/nutrition/plans'
import {
  createNutritionPlanEnvelope,
  LEGACY_COACH_WEEK,
} from '@/tests/fixtures/nutrition-plan-envelope'

const CREATED_AT = '2026-07-24T12:00:00.000Z'

function row(plan: PersonalMealPlanRow['plan'], overrides: Partial<PersonalMealPlanRow> = {}): PersonalMealPlanRow {
  return {
    id: 'personal-plan-1',
    user_id: 'owner-1',
    created_by: null,
    name: 'Plan personnel',
    plan,
    active: true,
    created_at: CREATED_AT,
    ...overrides,
  }
}

function port(result: Awaited<ReturnType<ActivePersonalMealPlanPort['findActivePersonalPlanForOwner']>>) {
  return {
    findActivePersonalPlanForOwner: vi.fn().mockResolvedValue(result),
  } satisfies ActivePersonalMealPlanPort
}

function canonicalPlan() {
  const converted = adaptLegacyNutritionPlan(LEGACY_COACH_WEEK)
  expect(converted.status).toBe('legacy_converted')
  if (converted.status !== 'legacy_converted') throw new Error('fixture conversion failed')
  return JSON.parse(JSON.stringify({
    ...converted.envelope,
    provenance: { ...converted.envelope.provenance, source: 'user', legacyFormat: null },
    warnings: [],
  }))
}

describe('active personal meal-plan reader', () => {
  it('distinguishes absence from an expurgated repository failure', async () => {
    await expect(createActivePersonalMealPlanReader(port({ ok: false, kind: 'not_found' }))
      .load('owner-1')).resolves.toEqual({ status: 'absent' })
    const result = await createActivePersonalMealPlanReader(port({
      ok: false,
      kind: 'failure',
      error: { kind: 'unavailable', contextCode: 'SECRET-PGRST' },
    })).load('owner-1')
    expect(result).toEqual({
      status: 'failure',
      error: { code: 'repository_failure', repositoryKind: 'unavailable' },
    })
    expect(JSON.stringify(result)).not.toContain('SECRET-PGRST')
  })

  it('presents a canonical active plan in the historical personal UI contract', async () => {
    const result = await createActivePersonalMealPlanReader(port({
      ok: true,
      data: row(canonicalPlan()),
    })).load('owner-1')
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.source).toBe('canonical')
    expect(result.plan).toMatchObject({
      id: 'personal-plan-1',
      user_id: 'owner-1',
      is_active: true,
      created_at: CREATED_AT,
      plan_data: {
        lundi: {
          meals: [{
            type: 'Déjeuner',
            foods: [{ name: 'Riz', qty: 100, kcal: 130, prot: 3, carb: 28, fat: 1 }],
          }],
        },
      },
    })
  })

  it('preserves a supported legacy document stored in the canonical plan column', async () => {
    const result = await createActivePersonalMealPlanReader(port({
      ok: true,
      data: row(LEGACY_COACH_WEEK),
    })).load('owner-1')
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.source).toBe('legacy_converted')
    expect(result.plan.plan_data).toBe(LEGACY_COACH_WEEK)
    expect(result.warnings).toContain('legacy_format')
  })

  it('fails closed on inactive, invalid, unsupported, conflicting, and incomplete rows', async () => {
    const divergentLegacy = structuredClone(LEGACY_COACH_WEEK)
    divergentLegacy.lundi.meals[0].foods[0].kcal = 999
    const incompleteCanonical = canonicalPlan()
    incompleteCanonical.content.days[0].meals[0].items[0].nutrition.fatG = null
    const cases: Array<[PersonalMealPlanRow, string, string]> = [
      [row(canonicalPlan(), { active: false }), 'invalid', 'incomplete_ui_projection'],
      [row({ ...createNutritionPlanEnvelope(), schemaVersion: 2 } as unknown as PersonalMealPlanRow['plan']), 'invalid', 'invalid_document'],
      [row({ monday: { meals: [] } }), 'legacy_unsupported', 'unsupported_legacy'],
      [{
        ...row(canonicalPlan()),
        plan_data: divergentLegacy,
      } as unknown as PersonalMealPlanRow, 'conflict', 'document_conflict'],
      [row(incompleteCanonical), 'invalid', 'incomplete_ui_projection'],
      [{
        ...row(canonicalPlan()),
        is_active: false,
      } as unknown as PersonalMealPlanRow, 'conflict', 'activation_conflict'],
    ]
    for (const [input, status, code] of cases) {
      await expect(createActivePersonalMealPlanReader(port({ ok: true, data: input }))
        .load('owner-1')).resolves.toMatchObject({ status, error: { code } })
    }
  })

  it('is deterministic, owner-scoped through its port, and does not mutate rows', async () => {
    const input = row(LEGACY_COACH_WEEK)
    const before = JSON.stringify(input)
    const repository = port({ ok: true, data: input })
    const reader = createActivePersonalMealPlanReader(repository)
    const first = await reader.load('owner-1')
    const second = await reader.load('owner-1')
    expect(first).toEqual(second)
    expect(repository.findActivePersonalPlanForOwner).toHaveBeenNthCalledWith(1, 'owner-1')
    expect(repository.findActivePersonalPlanForOwner).toHaveBeenNthCalledWith(2, 'owner-1')
    expect(JSON.stringify(input)).toBe(before)
  })
})
