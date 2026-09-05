import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import type { UserCapabilities } from '@/lib/entitlements/capabilities'
import type { ActiveTrainingProgramContext } from '@/lib/training/active-program'
import { resolveTrainingProgramAccess } from '@/lib/training/training-program-access'
import { deriveClientPermissions } from '@/lib/use-client-permissions'

const fullCapabilities: UserCapabilities = {
  training: true,
  ai: true,
  nutrition: true,
  coachManaged: false,
}

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

describe('solo vs coach-managed training program authority', () => {
  it.each(['not_found', 'ended'] as const)('keeps %s relation state solo', status => {
    const access = resolveTrainingProgramAccess({
      capabilities: fullCapabilities,
      activeProgramContext: context({ coachRelation: { status, coachId: null } }),
      quotaState: 'available',
    })

    expect(access).toMatchObject({
      authority: 'solo',
      source: 'none',
      isCoachManaged: false,
      canManagePersonalProgram: true,
      canGenerateWithAI: true,
      generationReason: null,
    })
  })

  it('ignores a historical coachManaged capability when no active relation exists', () => {
    const access = resolveTrainingProgramAccess({
      capabilities: { ...fullCapabilities, coachManaged: true },
      activeProgramContext: context(),
      quotaState: 'available',
    })

    expect(access).toMatchObject({ authority: 'solo', isCoachManaged: false, canManagePersonalProgram: true, canGenerateWithAI: true })
  })

  it('does not turn an invited legacy fallback into an active coach relation', () => {
    expect(deriveClientPermissions('invited', { kind: 'not_found' })).toMatchObject({
      isCoachManaged: false,
      coachRelationStatus: 'not_found',
    })
  })

  it('protects personal management and generation for an active matching coach plan', () => {
    const access = resolveTrainingProgramAccess({
      capabilities: fullCapabilities,
      activeProgramContext: context({
        state: 'ready',
        source: 'coach',
        programId: 'coach-program',
        program: { monday: { exercises: [{ name: 'Squat' }] } },
        coachRelation: { status: 'active', coachId: 'coach-1' },
      }),
      quotaState: 'available',
    })

    expect(access).toMatchObject({
      authority: 'coach_managed',
      source: 'coach',
      isCoachManaged: true,
      canManagePersonalProgram: false,
      canGenerateWithAI: false,
      generationReason: 'managed_by_active_coach',
    })
  })

  it.each([
    ['error', 'coach_relation_error'],
    ['multiple_active', 'multiple_active_coach_relations'],
  ] as const)('fails safe for %s without claiming an active coach', (status, reason) => {
    const access = resolveTrainingProgramAccess({
      capabilities: fullCapabilities,
      activeProgramContext: context({ coachRelation: { status, coachId: null } }),
      quotaState: 'available',
    })

    expect(access).toMatchObject({
      authority: 'fail_safe',
      isCoachManaged: false,
      canManagePersonalProgram: false,
      canGenerateWithAI: false,
      generationReason: reason,
    })
  })

  it.each([
    ['exhausted', 'quota_exhausted'],
    ['error', 'quota_error'],
  ] as const)('keeps %s quota failures distinct from coach authority', (quotaState, reason) => {
    const access = resolveTrainingProgramAccess({
      capabilities: fullCapabilities,
      activeProgramContext: context({
        state: 'ready',
        source: 'personal',
        programId: 'personal-program',
        program: { days: [] },
      }),
      quotaState,
    })

    expect(access).toMatchObject({
      authority: 'solo',
      source: 'personal',
      isCoachManaged: false,
      canManagePersonalProgram: true,
      canGenerateWithAI: false,
      generationReason: reason,
    })
  })

  it('keeps missing AI capability distinct from coach authority', () => {
    const access = resolveTrainingProgramAccess({
      capabilities: { ...fullCapabilities, ai: false },
      activeProgramContext: context(),
      quotaState: 'available',
    })

    expect(access).toMatchObject({ isCoachManaged: false, canManagePersonalProgram: true, canGenerateWithAI: false, generationReason: 'ai_not_available' })
  })

  it('does not use invited subscription state as runtime coach proof', () => {
    const accessSource = readFileSync('lib/training/training-program-access.ts', 'utf8')
    const permissionSource = readFileSync('lib/use-client-permissions.ts', 'utf8')
    expect(`${accessSource}\n${permissionSource}`).not.toMatch(/subscription_type\s*={2,3}\s*['"]invited['"]|subscriptionType\s*={2,3}\s*['"]invited['"]/)
    expect(accessSource).not.toContain('capabilities.coachManaged')
  })
})
