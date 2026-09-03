import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { deriveClientPermissions } from '@/lib/use-client-permissions'

const ACTIVE_RELATION = {
  kind: 'active' as const,
  relation: {
    id: 'relation-1',
    coach_id: 'coach-1',
    client_id: 'client-1',
    status: 'active' as const,
    source: 'invitation' as const,
  },
}

describe('client permission relation and entitlement separation', () => {
  it('preserves an active product entitlement without inventing a coach', () => {
    expect(deriveClientPermissions('client_monthly', { kind: 'not_found' })).toEqual({
      canCreatePrograms: true,
      canUseAI: true,
      canModifyNutrition: true,
      isCoachManaged: false,
      coachId: null,
      coachRelationStatus: 'not_found',
    })
  })

  it('uses an active relation as coach authority and blocks personal AI', () => {
    expect(deriveClientPermissions('client_monthly', ACTIVE_RELATION)).toMatchObject({
      coachId: 'coach-1',
      coachRelationStatus: 'active',
      isCoachManaged: true,
      canCreatePrograms: true,
      canUseAI: false,
      canModifyNutrition: true,
    })
  })

  it('does not reactivate an ended relation for a legacy invited entitlement', () => {
    expect(deriveClientPermissions('invited', { kind: 'not_found' })).toEqual({
      canCreatePrograms: false,
      canUseAI: false,
      canModifyNutrition: false,
      isCoachManaged: false,
      coachId: null,
      coachRelationStatus: 'not_found',
    })
  })

  it('does not let an active coach override a limited product entitlement', () => {
    expect(deriveClientPermissions('invited', ACTIVE_RELATION)).toMatchObject({
      coachId: 'coach-1',
      coachRelationStatus: 'active',
      isCoachManaged: true,
      canCreatePrograms: false,
      canUseAI: false,
      canModifyNutrition: false,
    })
  })

  it.each(['multiple_active', 'error'] as const)('fails safe for %s without inventing a coach', kind => {
    expect(deriveClientPermissions('client_monthly', kind === 'error'
      ? { kind, code: 'RELATION_LOOKUP_FAILED' }
      : { kind })).toMatchObject({
      coachId: null,
      coachRelationStatus: kind,
      isCoachManaged: false,
      canUseAI: false,
    })
  })

  it('reads relationships centrally without invitation metadata or direct writes', () => {
    const source = readFileSync('lib/use-client-permissions.ts', 'utf8')
    expect(source).toContain('findActiveCoachForClient(supabase, userId)')
    expect(source).not.toContain(".from('coach_clients')")
    expect(source).not.toMatch(/invited_by_coach|source\s*===?\s*['"]invitation['"]/)
    expect(source).not.toMatch(/\.(?:insert|upsert|delete)\(/)
  })
})
