import { describe, expect, it } from 'vitest'

import { readHomeNutritionSummary } from '@/lib/nutrition/home-nutrition-summary'
import {
  createActivePersonalMealPlanReader,
  type ActivePersonalMealPlanReadResult,
} from '@/lib/nutrition/personal-meal-plan-reader'
import { adaptLegacyNutritionPlan } from '@/lib/nutrition/plan-envelope'
import type { PersonalMealPlanRow } from '@/lib/repositories/nutrition/plans'
import { LEGACY_AI_WEEK } from '@/tests/fixtures/nutrition-plan-envelope'

const ROW_BASE = {
  id: 'personal-plan-1',
  user_id: 'owner-1',
  created_by: null,
  name: 'Plan personnel',
  active: true,
  created_at: '2026-07-24T12:00:00.000Z',
} as const

async function readyResult(plan: PersonalMealPlanRow['plan']) {
  return createActivePersonalMealPlanReader({
    findActivePersonalPlanForOwner: async () => ({
      ok: true,
      data: { ...ROW_BASE, plan },
    }),
  }).load('owner-1')
}

function canonicalAiPlan() {
  const converted = adaptLegacyNutritionPlan(LEGACY_AI_WEEK)
  expect(converted.status).toBe('legacy_converted')
  if (converted.status !== 'legacy_converted') throw new Error('fixture conversion failed')
  return JSON.parse(JSON.stringify({
    ...converted.envelope,
    provenance: { ...converted.envelope.provenance, source: 'user', legacyFormat: null },
    warnings: [],
  }))
}

describe('Home nutrition summary', () => {
  it('calculates the same completed meal for canonical and legacy personal plans', async () => {
    const canonical = await readyResult(canonicalAiPlan())
    const legacy = await readyResult(LEGACY_AI_WEEK)
    for (const plan of [canonical, legacy]) {
      expect(readHomeNutritionSummary(
        plan,
        [{ meal_type: 'dejeuner' }],
        [{ calories: 20 }],
        'lundi',
      )).toMatchObject({
        status: 'ready',
        consumedKcal: 150,
      })
    }
  })

  it('keeps not_found as the only absent plan result and still counts daily logs', () => {
    expect(readHomeNutritionSummary(
      { status: 'absent' },
      [],
      [{ calories: 0 }, { calories: 42 }],
      'lundi',
    )).toEqual({ status: 'absent', consumedKcal: 42 })
  })

  it('preserves every recoverable reader error instead of treating it as absence', () => {
    const errors: ActivePersonalMealPlanReadResult[] = [
      { status: 'conflict', error: { code: 'document_conflict' } },
      { status: 'invalid', error: { code: 'invalid_document' } },
      { status: 'legacy_unsupported', error: { code: 'unsupported_legacy' } },
      {
        status: 'failure',
        error: { code: 'repository_failure', repositoryKind: 'unavailable' },
      },
    ]
    for (const result of errors) {
      expect(readHomeNutritionSummary(result, [], [], 'lundi')).toEqual(result)
    }
  })

  it('fails closed on invalid logs or an unknown day without inventing zero', async () => {
    const plan = await readyResult(canonicalAiPlan())
    expect(readHomeNutritionSummary(plan, [], [{ calories: -1 }], 'lundi'))
      .toEqual({ status: 'invalid', error: { code: 'incomplete_ui_projection' } })
    expect(readHomeNutritionSummary(plan, [], [], 'unknown'))
      .toEqual({ status: 'invalid', error: { code: 'incomplete_ui_projection' } })
  })

  it('is deterministic and does not mutate its inputs', async () => {
    const plan = await readyResult(LEGACY_AI_WEEK)
    const completions = Object.freeze([{ meal_type: 'dejeuner' }])
    const logs = Object.freeze([{ calories: 20 }])
    const before = JSON.stringify({ plan, completions, logs })
    const first = readHomeNutritionSummary(plan, completions, logs, 'lundi')
    expect(readHomeNutritionSummary(plan, completions, logs, 'lundi')).toEqual(first)
    expect(JSON.stringify({ plan, completions, logs })).toBe(before)
  })
})
