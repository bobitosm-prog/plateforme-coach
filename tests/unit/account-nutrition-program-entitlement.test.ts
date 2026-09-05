import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveNutritionPlanStatus,
  resolveNutritionProgramAccess,
  type NutritionPlanStatus,
} from '@/lib/nutrition/nutrition-program-access'

const unrestricted = {
  ai: true,
  training: true,
  nutrition: true,
  coachManaged: false,
}
const quotaAvailable = { loading: false, error: null, remaining: 2 }

function access(overrides: {
  capabilities?: typeof unrestricted
  coachRelationStatus?: 'active' | 'not_found' | 'multiple_active' | 'error'
  coachPlanActive?: boolean
  planStatus?: NutritionPlanStatus
  quota?: { loading: boolean; error: string | null; remaining: number }
} = {}) {
  return resolveNutritionProgramAccess({
    capabilities: overrides.capabilities ?? unrestricted,
    coachRelationStatus: overrides.coachRelationStatus ?? 'not_found',
    coachPlanActive: overrides.coachPlanActive ?? false,
    planStatus: overrides.planStatus ?? 'empty',
    quota: overrides.quota ?? quotaAvailable,
  })
}

describe('personal nutrition program access', () => {
  it('allows a solo user without a coach to configure and generate', () => {
    expect(access()).toMatchObject({ canConfigure: true, canGenerate: true })
    expect(access({ coachRelationStatus: 'not_found' })).toMatchObject({
      canConfigure: true,
      canGenerate: true,
    })
  })

  it('allows generation and regeneration for empty and personal plan states', () => {
    expect(access({ planStatus: 'empty' }).canGenerate).toBe(true)
    expect(access({ planStatus: 'ready' }).canGenerate).toBe(true)
  })

  it('keeps product capability and quota gates explicit', () => {
    expect(access({ capabilities: { ...unrestricted, nutrition: false } })).toMatchObject({
      canConfigure: false,
      canGenerate: false,
      generationBlockReason: 'capability',
    })
    expect(access({ capabilities: { ...unrestricted, ai: false } })).toMatchObject({
      canConfigure: true,
      canGenerate: false,
      generationBlockReason: 'capability',
    })
    expect(access({ quota: { ...quotaAvailable, remaining: 0 } }).generationBlockReason).toBe('quota_exhausted')
    expect(access({ quota: { ...quotaAvailable, error: 'unavailable' } }).generationBlockReason).toBe('quota_error')
  })

  it('protects active coach plans and ambiguous relation states', () => {
    expect(access({ coachRelationStatus: 'active', coachPlanActive: true }).generationBlockReason).toBe('coach_plan')
    expect(access({ coachRelationStatus: 'multiple_active' }).generationBlockReason).toBe('relation_uncertain')
    expect(access({ coachRelationStatus: 'error' }).generationBlockReason).toBe('relation_uncertain')
    // Ended relations are absent from the active-only repository and therefore
    // have the same valid solo semantics as not_found.
    expect(access({ coachRelationStatus: 'not_found' }).canGenerate).toBe(true)
  })

  it('does not use coachManaged alone as product or relation authority', () => {
    expect(access({
      capabilities: {
        ai: false,
        training: false,
        nutrition: false,
        coachManaged: true,
      },
    })).toMatchObject({ canConfigure: false, canGenerate: false })
  })
})

describe('nutrition plan status safety', () => {
  it('keeps successful empty, active and failed reads distinct', () => {
    expect(resolveNutritionPlanStatus({ loading: false, error: false, hasActivePlan: false })).toBe('empty')
    expect(resolveNutritionPlanStatus({ loading: false, error: false, hasActivePlan: true })).toBe('ready')
    expect(resolveNutritionPlanStatus({ loading: false, error: true, hasActivePlan: false })).toBe('error')
  })

  it('blocks generation when the plan status is unknown without blocking configuration', () => {
    expect(access({ planStatus: 'error' })).toMatchObject({
      canConfigure: true,
      canGenerate: false,
      generationBlockReason: 'plan_read_error',
    })
  })

  it('keeps canonical bounded reads and clears stale coach state', () => {
    const source = readFileSync('app/components/tabs/profile/NutritionProgramSection.tsx', 'utf8')
    expect(source).toContain(".select('id,plan,active,created_at')")
    expect(source).toContain(".eq('active', true)")
    expect(source).toContain(".select('id,coach_id,plan,created_at,updated_at')")
    expect(source).toContain("setSnapshot(current => ({ ...current, loading: true, error: false, coachPlan: null }))")
    expect(source).not.toMatch(/plan_data|is_active/)
  })
})
