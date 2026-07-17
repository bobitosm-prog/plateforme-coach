import { describe, expect, it } from 'vitest'
import {
  CACHE_DOMAINS,
  CACHE_POLICY_REGISTRY,
  assessCacheEnvelope,
  createCacheKey,
  getCachePolicy,
  validateCachePolicies,
  type CacheEnvelope,
  type CachePolicy,
} from '../../lib/cache-policy'

function mutatePolicy(domain: CachePolicy['domain'], changes: Partial<CachePolicy>): CachePolicy[] {
  return CACHE_POLICY_REGISTRY.map((policy) =>
    policy.domain === domain ? ({ ...policy, ...changes } as CachePolicy) : ({ ...policy } as CachePolicy),
  )
}

describe('cache policy registry', () => {
  it('covers every required domain exactly once', () => {
    expect(CACHE_POLICY_REGISTRY.map(({ domain }) => domain)).toEqual(CACHE_DOMAINS)
    expect(new Set(CACHE_POLICY_REGISTRY.map(({ domain }) => domain)).size).toBe(CACHE_DOMAINS.length)
    expect(validateCachePolicies(CACHE_POLICY_REGISTRY)).toEqual([])
  })

  it('rejects invalid TTLs and incomplete invalidation contracts', () => {
    expect(
      validateCachePolicies(mutatePolicy('profile', { freshForMs: 2_000, retainForMs: 1_000 })),
    ).toContain('profile: freshForMs cannot exceed retainForMs')
    expect(validateCachePolicies(mutatePolicy('profile', { freshForMs: Number.NaN }))).toContain(
      'profile: freshForMs must be finite and non-negative',
    )
    expect(
      validateCachePolicies(
        mutatePolicy('profile', { invalidationEvents: [], noInvalidationReason: undefined }),
      ),
    ).toContain('profile: invalidation events or a justification are required')
  })

  it('forbids persistent critical data and non-user private data', () => {
    expect(
      validateCachePolicies(mutatePolicy('identity_session', { storage: ['local_storage'] })),
    ).toContain('identity_session: critical data cannot use persistent browser storage')
    expect(validateCachePolicies(mutatePolicy('profile', { scope: 'anonymous' }))).toContain(
      'profile: private data must be user-scoped',
    )
  })

  it('keeps role, subscription, relationship and payment authority on the server', () => {
    for (const domain of [
      'identity_session',
      'authorization_subscription',
      'coach_dashboard_relations',
      'payments_billing',
    ] as const) {
      const policy = getCachePolicy(domain)
      expect(policy.authority).toBe('server')
      expect(policy.cacheIsAuthoritative).toBe(false)
    }
    expect(validateCachePolicies(mutatePolicy('payments_billing', { cacheIsAuthoritative: true }))).toContain(
      'payments_billing: a cache cannot replace server authority',
    )
  })

  it('requires logout and identity invalidation for persistent user caches', () => {
    expect(getCachePolicy('client_dashboard').invalidationEvents).toEqual(
      expect.arrayContaining(['sign_out', 'identity_changed']),
    )
    expect(getCachePolicy('training_progress').invalidationEvents).toEqual(
      expect.arrayContaining(['sign_out', 'identity_changed']),
    )
    expect(
      validateCachePolicies(
        mutatePolicy('client_dashboard', {
          invalidationEvents: ['identity_changed'],
        }),
      ),
    ).toContain('client_dashboard: persistent user cache must invalidate on sign_out')
  })
})

describe('cache envelope contract', () => {
  const policy = getCachePolicy('client_dashboard')
  const envelope: CacheEnvelope<{ profile: string }> = {
    keyVersion: policy.keyVersion,
    ownerUserId: 'user-a',
    storedAt: 1_000,
    freshUntil: 2_000,
    expiresAt: 3_000,
    kind: 'value',
    data: { profile: 'synthetic' },
  }

  it('uses an injectable clock for fresh, stale and expired decisions', () => {
    expect(assessCacheEnvelope(policy, envelope, { now: () => 1_500, userId: 'user-a' })).toEqual({
      status: 'fresh',
    })
    expect(assessCacheEnvelope(policy, envelope, { now: () => 2_500, userId: 'user-a' })).toEqual({
      status: 'stale',
    })
    expect(assessCacheEnvelope(policy, envelope, { now: () => 3_000, userId: 'user-a' })).toEqual({
      status: 'rejected',
      reason: 'expired',
    })
  })

  it('rejects cross-user envelopes and obsolete key versions', () => {
    expect(assessCacheEnvelope(policy, envelope, { now: () => 1_500, userId: 'user-b' })).toEqual({
      status: 'rejected',
      reason: 'owner',
    })
    expect(
      assessCacheEnvelope(policy, { ...envelope, keyVersion: policy.keyVersion + 1 }, {
        now: () => 1_500,
        userId: 'user-a',
      }),
    ).toEqual({ status: 'rejected', reason: 'version' })
  })

  it('never accepts a cached network error as a negative result', () => {
    expect(
      assessCacheEnvelope(policy, { ...envelope, kind: 'error' }, {
        now: () => 1_500,
        userId: 'user-a',
      }),
    ).toEqual({ status: 'rejected', reason: 'error' })
    expect(
      assessCacheEnvelope(getCachePolicy('payments_billing'), {
        ...envelope,
        ownerUserId: 'user-a',
        keyVersion: getCachePolicy('payments_billing').keyVersion,
        kind: 'confirmed_not_found',
      }, {
        now: () => 1_500,
        userId: 'user-a',
      }),
    ).toEqual({ status: 'rejected', reason: 'negative_cache_forbidden' })
  })

  it('versions and scopes cache keys', () => {
    expect(createCacheKey(policy, { userId: 'user-a', resource: 'overview/2026' })).toBe(
      'moovx-cache:v1:client_dashboard:user-a:overview%2F2026',
    )
    expect(() => createCacheKey(policy)).toThrow('userId is required')
    expect(createCacheKey(getCachePolicy('public_catalogs'), { resource: 'exercises' })).toBe(
      'moovx-cache:v1:public_catalogs:public:exercises',
    )
  })
})
