import { describe, expect, it } from 'vitest'

import {
  createInitialGenerationMealPlanControl,
  settleInitialGenerationMealPlanControl,
} from '@/lib/nutrition/initial-generation-meal-plan-control'
import type {
  ActivePersonalMealPlanReadResult,
} from '@/lib/nutrition/personal-meal-plan-reader'

const READY_CANONICAL = {
  status: 'ready',
  source: 'canonical',
  plan: {} as never,
  envelope: {} as never,
  warnings: [],
} satisfies ActivePersonalMealPlanReadResult

const READY_LEGACY = {
  ...READY_CANONICAL,
  source: 'legacy_converted',
} satisfies ActivePersonalMealPlanReadResult

function failure(status: 'conflict' | 'invalid' | 'legacy_unsupported' | 'failure') {
  const codes = {
    conflict: 'document_conflict',
    invalid: 'invalid_document',
    legacy_unsupported: 'unsupported_legacy',
    failure: 'repository_failure',
  } as const
  return {
    status,
    error: { code: codes[status] },
  } as ActivePersonalMealPlanReadResult
}

describe('initial generation meal-plan control', () => {
  it.each([
    ['canonical', READY_CANONICAL, true, 'canonical'],
    ['legacy_converted', READY_LEGACY, true, 'legacy_converted'],
    ['not_found', { status: 'absent' }, false, 'not_found'],
    ['conflict', failure('conflict'), true, 'conflict'],
    ['invalid', failure('invalid'), true, 'invalid'],
    ['legacy_unsupported', failure('legacy_unsupported'), true, 'legacy_unsupported'],
    ['failure', failure('failure'), false, 'failure'],
  ] as const)('maps %s without changing the legacy existence decision', (
    _case,
    read,
    expectedPresence,
    expectedEvidence,
  ) => {
    const state = settleInitialGenerationMealPlanControl(
      createInitialGenerationMealPlanControl(),
      read,
      true,
    )
    expect(state.hasActivePlan).toBe(expectedPresence)
    expect(state.evidence).toBe(expectedEvidence)
  })

  it('starts unknown without inventing an active plan', () => {
    expect(createInitialGenerationMealPlanControl()).toEqual({
      status: 'idle',
      hasActivePlan: false,
      evidence: null,
    })
  })

  it('reports a first-load failure without inventing a visible value', () => {
    expect(settleInitialGenerationMealPlanControl(
      createInitialGenerationMealPlanControl(),
      failure('failure'),
      true,
    )).toEqual({
      status: 'error',
      hasActivePlan: false,
      evidence: 'failure',
    })
  })

  it('retains a visible decision when a later read fails', () => {
    const visible = settleInitialGenerationMealPlanControl(
      createInitialGenerationMealPlanControl(),
      READY_CANONICAL,
      true,
    )
    const afterFailure = settleInitialGenerationMealPlanControl(
      visible,
      failure('failure'),
      true,
    )
    expect(afterFailure).toEqual({
      status: 'error',
      hasActivePlan: true,
      evidence: 'failure',
    })
  })

  it('ignores a stale failure arriving after a valid response', () => {
    const valid = settleInitialGenerationMealPlanControl(
      createInitialGenerationMealPlanControl(),
      READY_LEGACY,
      true,
    )
    expect(settleInitialGenerationMealPlanControl(
      valid,
      failure('failure'),
      false,
    )).toBe(valid)
  })
})
