import { describe, expect, it, vi } from 'vitest'

import {
  createClientDetailAssignedPlanReader,
  type ClientDetailAssignedPlanPort,
} from '@/lib/coaching/client-detail/nutrition-plan-reader'
import { adaptLegacyNutritionPlan } from '@/lib/nutrition/plan-envelope'
import type { ClientDetailAssignedMealPlanRow } from '@/lib/repositories/nutrition/plans'
import {
  createNutritionPlanEnvelope,
  LEGACY_COACH_WEEK,
} from '@/tests/fixtures/nutrition-plan-envelope'

const scope = { coachUserId: 'coach-1', clientUserId: 'client-1' }

function row(
  plan: ClientDetailAssignedMealPlanRow['plan'],
  overrides: Partial<ClientDetailAssignedMealPlanRow> = {},
): ClientDetailAssignedMealPlanRow {
  return {
    id: 'assigned-1',
    client_id: 'client-1',
    coach_id: 'coach-1',
    plan,
    created_at: '2026-07-24T12:00:00.000Z',
    updated_at: '2026-07-24T12:00:00.000Z',
    calorie_target: null,
    protein_target: null,
    carb_target: null,
    fat_target: null,
    ...overrides,
  }
}

function port(result: Awaited<ReturnType<ClientDetailAssignedPlanPort['findLatestAssignedPlanForCoachClient']>>) {
  return {
    findLatestAssignedPlanForCoachClient: vi.fn().mockResolvedValue(result),
  } satisfies ClientDetailAssignedPlanPort
}

function canonicalPlan() {
  const converted = adaptLegacyNutritionPlan(LEGACY_COACH_WEEK)
  expect(converted.status).toBe('legacy_converted')
  if (converted.status !== 'legacy_converted') throw new Error('fixture conversion failed')
  return JSON.parse(JSON.stringify({
    ...converted.envelope,
    targets: {
      ...converted.envelope.targets,
      energyKcal: { status: 'known', value: 2200, provenance: 'declared' },
      proteinG: { status: 'known', value: 160, provenance: 'declared' },
      carbsG: { status: 'known', value: 230, provenance: 'declared' },
      fatG: { status: 'known', value: 75, provenance: 'declared' },
    },
    provenance: { ...converted.envelope.provenance, source: 'coach', legacyFormat: null },
    warnings: [],
  }))
}

describe('client detail assigned Nutrition plan reader', () => {
  it('distinguishes absence from an expurgated repository failure', async () => {
    await expect(createClientDetailAssignedPlanReader(port({ ok: false, kind: 'not_found' }))
      .load(scope)).resolves.toEqual({ status: 'absent' })
    const result = await createClientDetailAssignedPlanReader(port({
      ok: false,
      kind: 'failure',
      error: { kind: 'unavailable', contextCode: 'PRIVATE-SQL' },
    })).load(scope)
    expect(result).toEqual({
      status: 'failure',
      error: { code: 'repository_failure', repositoryKind: 'unavailable' },
    })
    expect(JSON.stringify(result)).not.toContain('PRIVATE-SQL')
  })

  it('presents canonical content and targets through the historical UI contract', async () => {
    const result = await createClientDetailAssignedPlanReader(port({
      ok: true,
      data: row(canonicalPlan(), {
        calorie_target: 1900,
        protein_target: 120,
        carb_target: 180,
        fat_target: 60,
      }),
    })).load(scope)
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.source).toBe('canonical')
    expect(result.plan).toMatchObject({
      id: 'assigned-1',
      calorie_target: 2200,
      protein_target: 160,
      carb_target: 230,
      fat_target: 75,
      plan: {
        lundi: {
          meals: [{
            type: 'Déjeuner',
            foods: [{ name: 'Riz', qty: 100, kcal: 130, prot: 3, carb: 28, fat: 1 }],
          }],
        },
      },
    })
  })

  it('preserves supported legacy content and its deployed runtime targets', async () => {
    const result = await createClientDetailAssignedPlanReader(port({
      ok: true,
      data: {
        ...row(LEGACY_COACH_WEEK),
        calorie_target: 2283,
        protein_target: 134,
        carb_target: 266,
        fat_target: 76,
      },
    })).load(scope)
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.source).toBe('legacy_converted')
    expect(result.plan.plan).toBe(LEGACY_COACH_WEEK)
    expect(result.plan).toMatchObject({
      calorie_target: 2283,
      protein_target: 134,
      carb_target: 266,
      fat_target: 76,
    })
  })

  it('does not convert an invalid deployed runtime target to null or zero', async () => {
    const result = await createClientDetailAssignedPlanReader(port({
      ok: true,
      data: {
        ...row(LEGACY_COACH_WEEK),
        calorie_target: -1,
        protein_target: 134,
        carb_target: 266,
        fat_target: 76,
      },
    })).load(scope)

    expect(result).toEqual({
      status: 'invalid',
      error: { code: 'incomplete_ui_projection' },
    })
  })

  it('keeps genuinely unknown legacy targets as null', async () => {
    const result = await createClientDetailAssignedPlanReader(port({
      ok: true,
      data: row(LEGACY_COACH_WEEK),
    })).load(scope)

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.plan).toMatchObject({
      calorie_target: null,
      protein_target: null,
      carb_target: null,
      fat_target: null,
    })
  })

  it('fails closed on conflict, invalid, unsupported, incomplete, and foreign authority', async () => {
    const conflict = structuredClone(LEGACY_COACH_WEEK)
    const conflictingFood = conflict.lundi.meals[0].foods[0] as Record<string, unknown>
    conflictingFood.protein = 3
    conflictingFood.proteins = 4
    const incomplete = canonicalPlan()
    incomplete.content.days[0].meals[0].items[0].nutrition.energyKcal = null
    const cases: Array<[ClientDetailAssignedMealPlanRow, string, string]> = [
      [row(conflict), 'conflict', 'document_conflict'],
      [row({ ...createNutritionPlanEnvelope(), schemaVersion: 2 } as unknown as ClientDetailAssignedMealPlanRow['plan']), 'invalid', 'invalid_document'],
      [row({ monday: { meals: [] } }), 'legacy_unsupported', 'unsupported_legacy'],
      [row(incomplete), 'invalid', 'incomplete_ui_projection'],
      [row(canonicalPlan(), { coach_id: 'foreign-coach' }), 'invalid', 'incomplete_ui_projection'],
    ]
    for (const [input, status, code] of cases) {
      await expect(createClientDetailAssignedPlanReader(port({ ok: true, data: input }))
        .load(scope)).resolves.toMatchObject({ status, error: { code } })
    }
  })

  it('passes the exact coach/client scope and does not mutate rows', async () => {
    const input = row(LEGACY_COACH_WEEK)
    const before = JSON.stringify(input)
    const repository = port({ ok: true, data: input })
    await createClientDetailAssignedPlanReader(repository).load(scope)
    expect(repository.findLatestAssignedPlanForCoachClient)
      .toHaveBeenCalledWith('coach-1', 'client-1')
    expect(JSON.stringify(input)).toBe(before)
  })
})
