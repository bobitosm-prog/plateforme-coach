import { describe, expect, it } from 'vitest'

import type { UserCapabilities } from '@/lib/entitlements/capabilities'
import type { ActiveTrainingProgramContext } from '@/lib/training/active-program'
import {
  resolveProfileTrainingObjective,
  resolveTrainingProgramAccess,
  resolveTrainingProgramFrequency,
} from '@/lib/training/training-program-access'

const capabilities: UserCapabilities = { training: true, ai: true, nutrition: true, coachManaged: false }

function context(overrides: Partial<ActiveTrainingProgramContext> = {}): ActiveTrainingProgramContext {
  return {
    state: 'empty',
    source: 'none',
    programId: null,
    program: null,
    coachRelation: { status: 'not_found', coachId: null },
    editable: false,
    replacementScope: 'none',
    errors: [],
    ...overrides,
  }
}

describe('Account training program access', () => {
  it.each(['not_found', 'ended'] as const)('treats %s as a valid solo state', status => {
    const result = resolveTrainingProgramAccess({
      capabilities,
      activeProgramContext: context({ coachRelation: { status, coachId: null } }),
    })

    expect(result).toEqual({ canView: true, canConfigure: true, canGenerateLater: true, reason: null })
  })

  it('protects personal configuration only for a proven active coach program', () => {
    const result = resolveTrainingProgramAccess({
      capabilities,
      activeProgramContext: context({
        state: 'ready',
        source: 'coach',
        programId: 'coach-program',
        program: { lundi: { exercises: [{ name: 'Squat' }] } },
        coachRelation: { status: 'active', coachId: 'coach-a' },
      }),
    })

    expect(result).toMatchObject({ canConfigure: false, canGenerateLater: false, reason: 'coach_plan_protected' })
  })

  it.each(['multiple_active', 'error'] as const)('fails safe for a %s relation', status => {
    const result = resolveTrainingProgramAccess({
      capabilities,
      activeProgramContext: context({ coachRelation: { status, coachId: null } }),
    })

    expect(result).toMatchObject({ canConfigure: false, canGenerateLater: false, reason: 'relation_uncertain' })
  })

  it('keeps program authority errors distinct from an empty configurable state', () => {
    const empty = resolveTrainingProgramAccess({ capabilities, activeProgramContext: context() })
    const error = resolveTrainingProgramAccess({ capabilities, activeProgramContext: context({ state: 'error' }) })

    expect(empty.canConfigure).toBe(true)
    expect(error).toMatchObject({ canConfigure: false, reason: 'authority_error' })
  })

  it('does not use coachManaged alone as proof of an active relation', () => {
    const coachManagedCapabilities: UserCapabilities = { ...capabilities, coachManaged: true }
    const result = resolveTrainingProgramAccess({
      capabilities: coachManagedCapabilities,
      activeProgramContext: context(),
    })

    expect(result.canConfigure).toBe(true)
  })

  it('separates training configuration from future AI generation access', () => {
    const result = resolveTrainingProgramAccess({
      capabilities: { ...capabilities, ai: false },
      activeProgramContext: context(),
    })

    expect(result).toMatchObject({ canConfigure: true, canGenerateLater: false, reason: 'ai_unavailable' })
  })
})

describe('Account training program summary derivation', () => {
  it('counts only non-rest, non-empty personal days', () => {
    const active = context({
      state: 'ready',
      source: 'personal',
      program: {
        days: [
          { exercises: [{ name: 'Squat' }] },
          { is_rest: true, exercises: [{ name: 'Walk' }] },
          { exercises: [] },
          { exercises: [{ name: 'Press' }] },
        ],
      },
    })

    expect(resolveTrainingProgramFrequency(active)).toBe(2)
  })

  it('counts active days from the normalized coach payload', () => {
    const active = context({
      state: 'partial',
      source: 'coach',
      program: {
        lundi: { exercises: [{ name: 'Squat' }] },
        mardi: { repos: true, exercises: [] },
        mercredi: { exercises: [{ name: 'Press' }] },
      },
    })

    expect(resolveTrainingProgramFrequency(active)).toBe(2)
  })

  it('returns unavailable instead of a misleading zero', () => {
    expect(resolveTrainingProgramFrequency(context({ state: 'ready', source: 'personal', program: { days: [] } }))).toBeNull()
    expect(resolveTrainingProgramFrequency(context({ state: 'error' }))).toBeNull()
  })

  it('does not invent a mass objective when the profile objective is missing', () => {
    expect(resolveProfileTrainingObjective(undefined)).toEqual({ key: null, label: null })
    expect(resolveProfileTrainingObjective('')).toEqual({ key: null, label: null })
    expect(resolveProfileTrainingObjective('Force')).toEqual({ key: 'strength', label: 'Force' })
  })
})
