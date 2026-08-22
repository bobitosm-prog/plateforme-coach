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
  },
}

describe('client permission relation and entitlement separation', () => {
  it('preserves an active product entitlement without inventing a coach', () => {
    expect(deriveClientPermissions('client_monthly', { kind: 'not_found' })).toEqual({
      canCreatePrograms: true,
      canUseAI: true,
      canModifyNutrition: true,
      isInvited: false,
      coachId: null,
      coachRelationStatus: 'not_found',
    })
  })

  it('combines an active coach with independently active product rights', () => {
    expect(deriveClientPermissions('client_monthly', ACTIVE_RELATION)).toMatchObject({
      coachId: 'coach-1',
      coachRelationStatus: 'active',
      canCreatePrograms: true,
      canUseAI: true,
      canModifyNutrition: true,
    })
  })

  it('does not reactivate an ended relation for a legacy invited entitlement', () => {
    expect(deriveClientPermissions('invited', { kind: 'not_found' })).toEqual({
      canCreatePrograms: false,
      canUseAI: false,
      canModifyNutrition: false,
      isInvited: true,
      coachId: null,
      coachRelationStatus: 'not_found',
    })
  })

  it('does not let an active coach override a limited product entitlement', () => {
    expect(deriveClientPermissions('invited', ACTIVE_RELATION)).toMatchObject({
      coachId: 'coach-1',
      coachRelationStatus: 'active',
      canCreatePrograms: false,
      canUseAI: false,
      canModifyNutrition: false,
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
