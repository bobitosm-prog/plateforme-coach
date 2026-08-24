import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: mocks.from },
}))

import { getActiveLegacyEntitlement } from '@/lib/entitlements/legacy-entitlement-repository'
import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const GRANT_ID = '22222222-2222-4222-8222-222222222222'

type QueryResult = {
  data: unknown
  error: unknown
}

function arrangeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    lte: vi.fn(),
    is: vi.fn(),
    or: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.lte.mockReturnValue(query)
  query.is.mockReturnValue(query)
  query.or.mockReturnValue(query)
  mocks.from.mockReturnValue(query)
  return query
}

function activeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: GRANT_ID,
    user_id: USER_ID,
    type: 'legacy_invited_access',
    source: 'migration',
    starts_at: '2026-01-01T00:00:00.000Z',
    ends_at: null,
    revoked_at: null,
    ...overrides,
  }
}

describe('legacy entitlement repository shadow read', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a validated active grant through the bounded server query', async () => {
    const query = arrangeQuery({ data: [activeRow()], error: null })

    await expect(getActiveLegacyEntitlement(USER_ID)).resolves.toEqual({
      type: 'legacy_invited_access',
      active: true,
      source: 'migration',
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: null,
      revokedAt: null,
    })

    expect(mocks.from).toHaveBeenCalledWith('legacy_entitlements')
    expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', USER_ID)
    expect(query.eq).toHaveBeenNthCalledWith(2, 'type', 'legacy_invited_access')
    expect(query.lte).toHaveBeenCalledWith('starts_at', expect.any(String))
    expect(query.is).toHaveBeenCalledWith('revoked_at', null)
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining('ends_at.is.null'))
    expect(query.limit).toHaveBeenCalledWith(2)
  })

  it.each([
    ['expired', { ends_at: '2026-02-01T00:00:00.000Z' }],
    ['revoked', { revoked_at: '2026-02-01T00:00:00.000Z' }],
    ['invalid type', { type: 'admin_grant' }],
    ['invalid source', { source: 'browser' }],
  ])('rejects an invalid %s grant so authorization can fail closed', async (_label, override) => {
    arrangeQuery({ data: [activeRow(override)], error: null })
    await expect(getActiveLegacyEntitlement(USER_ID)).rejects.toThrow(
      'LEGACY_ENTITLEMENT_INVALID_GRANT',
    )
  })

  it('fails closed and logs only a controlled code on DB error', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    arrangeQuery({ data: null, error: { code: 'DB_TIMEOUT', message: 'sensitive' } })

    await expect(getActiveLegacyEntitlement(USER_ID)).rejects.toThrow(
      'LEGACY_ENTITLEMENT_LOOKUP_FAILED',
    )
    expect(errorLog).toHaveBeenCalledWith(
      '[legacy-entitlements] Shadow lookup failed',
      { code: 'DB_TIMEOUT' },
    )
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('sensitive')
    errorLog.mockRestore()
  })

  it('fails closed on duplicate active grants', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    arrangeQuery({
      data: [activeRow(), activeRow({ id: '33333333-3333-4333-8333-333333333333' })],
      error: null,
    })

    await expect(getActiveLegacyEntitlement(USER_ID)).rejects.toThrow(
      'LEGACY_ENTITLEMENT_INTEGRITY_ERROR',
    )
    expect(errorLog).toHaveBeenCalledWith(
      '[legacy-entitlements] Integrity violation: multiple active grants',
    )
    errorLog.mockRestore()
  })

  it('ignores metadata and requires neither relation nor subscription fallback', async () => {
    arrangeQuery({
      data: [activeRow({ metadata: { grantsAccess: false, coachId: 'ignored' } })],
      error: null,
    })

    const grant = await getActiveLegacyEntitlement(USER_ID)
    expect(grant).not.toHaveProperty('metadata')

    const source = readFileSync(
      'lib/entitlements/legacy-entitlement-repository.ts',
      'utf8',
    )
    expect(source).not.toMatch(/coach_clients|invited_by_coach|relation\.status/)
    expect(source).not.toMatch(/subscription_type|subscription_status|trial_ends_at/)
  })

  it('does not activate the shadow result in capability resolution', () => {
    const shadowGrant = {
      type: 'legacy_invited_access' as const,
      active: true,
      source: 'migration' as const,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
    }

    expect(resolveUserCapabilities({
      subscriptionType: 'invited',
      legacyEntitlements: [shadowGrant],
    })).toEqual(resolveUserCapabilities({ subscriptionType: 'invited' }))
    expect(resolveUserCapabilities({
      subscriptionType: 'client_monthly',
      legacyEntitlements: [shadowGrant],
    })).toEqual(resolveUserCapabilities({ subscriptionType: 'client_monthly' }))
  })
})
