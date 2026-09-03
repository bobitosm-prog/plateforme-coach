import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveCoachRelationAuthority, toActiveCoachResolutionState, type ActiveRelationLookupResult } from '@/lib/coach-relations/repository'
import { resolveActiveTrainingProgram, type PersonalTrainingProgram } from '@/lib/training/active-program'
import { resolveActiveNutritionPlan } from '@/lib/nutrition/nutrition-dashboard-model'
import { resolveActiveCoachForOnboarding } from '@/lib/coach-relations/onboarding-reader'
import { deriveClientPermissions } from '@/lib/use-client-permissions'
import { resolveInitialGenerationAuthority } from '@/app/hooks/useInitialGeneration'

const personal = { id: 'personal', days: [], is_active: true } satisfies PersonalTrainingProgram
const coachPrograms = [{ id: 'coach-plan', coach_id: 'coach-1', program: { days: [] } }]

function relation(source: 'default' | 'legacy' | 'invitation' | 'admin'): ActiveRelationLookupResult {
  return { kind: 'active', relation: { id: 'r1', coach_id: 'coach-1', client_id: 'client-1', status: 'active', source } }
}

function state(result: ActiveRelationLookupResult) {
  return toActiveCoachResolutionState(result)
}

describe('authoritative coach runtime consumers', () => {
  it.each(['default', 'legacy'] as const)('%s ignores coach training and nutrition plans', source => {
    const coachRelation = state(relation(source))
    const training = resolveActiveTrainingProgram({ coachRelation, coachPrograms, personalProgram: personal, capabilities: { training: true } })
    const nutrition = resolveActiveNutritionPlan({
      coachRelationStatus: coachRelation.status,
      coachId: coachRelation.coachId,
      isAuthoritative: coachRelation.isAuthoritative,
      coachMealPlan: { id: 'coach-meal', coach_id: 'coach-1', plan: {} },
      personalMealPlan: { id: 'personal-meal', active: true, plan: {} },
    })
    expect(training.source).toBe('personal')
    expect(nutrition.source).toBe('personal')
    expect(coachRelation.requiresReconciliation).toBe(source === 'legacy')
  })

  it('keeps a default client empty when no personal training program exists', () => {
    const result = resolveActiveTrainingProgram({
      coachRelation: state(relation('default')),
      coachPrograms,
      personalProgram: null,
      capabilities: { training: true },
    })
    expect(result).toMatchObject({ state: 'empty', source: 'none' })
  })

  it('keeps a default client empty when no personal nutrition plan exists', () => {
    const coachRelation = state(relation('default'))
    expect(resolveActiveNutritionPlan({
      coachRelationStatus: coachRelation.status,
      coachId: coachRelation.coachId,
      isAuthoritative: coachRelation.isAuthoritative,
      coachMealPlan: { id: 'coach-meal', coach_id: 'coach-1', plan: {} },
      personalMealPlan: null,
    })).toMatchObject({ state: 'empty', source: 'none' })
  })

  it.each(['invitation', 'admin'] as const)('%s selects matching coach plans', source => {
    const coachRelation = state(relation(source))
    expect(resolveActiveTrainingProgram({ coachRelation, coachPrograms, personalProgram: personal, capabilities: { training: true } }).source).toBe('coach')
    expect(resolveActiveNutritionPlan({
      coachRelationStatus: coachRelation.status,
      coachId: coachRelation.coachId,
      isAuthoritative: coachRelation.isAuthoritative,
      coachMealPlan: { id: 'coach-meal', coach_id: 'coach-1', plan: {} },
      personalMealPlan: { id: 'personal-meal', active: true, plan: {} },
    }).source).toBe('coach')
  })

  it('rejects a coach program whose coach does not match the authoritative relation', () => {
    const result = resolveActiveTrainingProgram({ coachRelation: state(relation('invitation')), coachPrograms: [{ ...coachPrograms[0], coach_id: 'coach-2' }], personalProgram: personal, capabilities: { training: true } })
    expect(result.source).toBe('personal')
  })

  it.each([{ kind: 'not_found' } as const, { kind: 'error', code: 'DB' } as const, { kind: 'multiple_active' } as const])('handles physical state $kind safely', input => {
    const result = resolveActiveTrainingProgram({ coachRelation: state(input), coachPrograms, personalProgram: personal, capabilities: { training: true } })
    if (input.kind === 'not_found') expect(result.source).toBe('personal')
    else expect(result).toMatchObject({ state: 'error', source: 'none' })
  })

  it.each([{ kind: 'error', code: 'DB' } as const, { kind: 'multiple_active' } as const])('fails nutrition safe for $kind', input => {
    const coachRelation = state(input)
    expect(resolveActiveNutritionPlan({
      coachRelationStatus: coachRelation.status,
      coachId: coachRelation.coachId,
      isAuthoritative: coachRelation.isAuthoritative,
      coachMealPlan: { id: 'coach-meal', coach_id: 'coach-1', plan: {} },
      personalMealPlan: { id: 'personal-meal', active: true, plan: {} },
    })).toMatchObject({ state: 'error', source: 'none' })
  })

  it.each([
    ['default', 'inactive'],
    ['legacy', 'inactive'],
    ['invitation', 'active'],
    ['admin', 'active'],
  ] as const)('maps %s onboarding to %s', async (source, expected) => {
    const lookup = vi.fn().mockResolvedValue(relation(source))
    const result = await resolveActiveCoachForOnboarding({} as SupabaseClient, 'client-1', lookup)
    expect(result.kind).toBe(expected)
  })

  it('keeps onboarding fail-safe for relation errors and multiples', async () => {
    for (const result of [{ kind: 'error', code: 'DB' }, { kind: 'multiple_active' }] as const) {
      await expect(resolveActiveCoachForOnboarding({} as SupabaseClient, 'client-1', vi.fn().mockResolvedValue(result))).resolves.toEqual({ kind: 'denied' })
    }
  })

  it.each(['default', 'legacy'] as const)('%s is not coach-managed and keeps AI capability', source => {
    expect(deriveClientPermissions('client_monthly', relation(source))).toMatchObject({ isCoachManaged: false, canUseAI: true, coachId: null })
  })

  it('marks invitation as coach-managed and uncertain states as fail-safe', () => {
    expect(deriveClientPermissions('client_monthly', relation('invitation'))).toMatchObject({ isCoachManaged: true, canUseAI: false, coachId: 'coach-1' })
    expect(deriveClientPermissions('client_monthly', { kind: 'multiple_active' })).toMatchObject({ isCoachManaged: false, canUseAI: false })
  })

  it('allows solo initial generation and blocks it only for authoritative coaching', () => {
    expect(resolveInitialGenerationAuthority({
      capabilities: { ai: true, training: true, nutrition: true, coachManaged: false },
      coachRelationStatus: 'active',
      coachId: null,
      coachRelationIsAuthoritative: false,
    })).toEqual({ relationUncertain: false, coachManaged: false })
    expect(resolveInitialGenerationAuthority({
      capabilities: { ai: true, training: true, nutrition: true, coachManaged: true },
      coachRelationStatus: 'active',
      coachId: 'coach-1',
      coachRelationIsAuthoritative: true,
    })).toEqual({ relationUncertain: false, coachManaged: true })
  })

  it('uses the shared authority resolver and adds no relation read', () => {
    expect(resolveCoachRelationAuthority(relation('default')).isAuthoritative).toBe(false)
    const sources = ['app/hooks/useClientDashboard.ts', 'app/hooks/useInitialGeneration.ts', 'lib/coach-relations/onboarding-reader.ts', 'app/components/VideoFeedbackModal.tsx', 'app/api/send-notification/route.ts'].map(path => readFileSync(path, 'utf8')).join('\n')
    expect(sources).not.toMatch(/invited_by_coach\s*===?|source\s*===?\s*['"](?:invitation|admin)['"]/)
    expect(sources.match(/\.from\(['"]coach_clients['"]\)/g) ?? []).toHaveLength(0)
  })
})
