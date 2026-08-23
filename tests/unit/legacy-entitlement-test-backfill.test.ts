import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveUserCapabilities } from '@/lib/entitlements/capabilities'
import { resolveEffectiveEntitlement } from '@/lib/entitlements/effective-entitlement'
import type { LegacyEntitlement } from '@/lib/entitlements/legacy-entitlements'
import {
  LEGACY_ENTITLEMENT_TEST_BATCH,
  LEGACY_ENTITLEMENT_TEST_MANIFEST,
  LEGACY_ENTITLEMENT_TEST_STARTS_AT,
} from '@/tests/fixtures/legacy-entitlement-test-manifest'
import {
  applyLegacyEntitlementTestBackfill,
  rollbackLegacyEntitlementTestBackfill,
  toLegacyEntitlement,
  type LegacyEntitlementTestRow,
  type LegacyEntitlementTestStore,
} from '@/tests/support/legacy-entitlement-test-backfill'

const NOW = new Date('2026-08-24T12:00:00.000Z')
const coachManaged = {
  ai: false,
  training: false,
  nutrition: false,
  coachManaged: true,
}
const unrestricted = {
  ai: true,
  training: true,
  nutrition: true,
  coachManaged: false,
}

function createStore(): LegacyEntitlementTestStore {
  return {
    profiles: new Map(LEGACY_ENTITLEMENT_TEST_MANIFEST.map(entry => [
      entry.userId,
      { id: entry.userId, subscriptionType: entry.subscriptionType },
    ])),
    legacyEntitlements: new Map(),
  }
}

function activeGrant(): LegacyEntitlement {
  return {
    type: 'legacy_invited_access',
    active: true,
    source: 'migration',
    startsAt: new Date(LEGACY_ENTITLEMENT_TEST_STARTS_AT),
    endsAt: null,
    revokedAt: null,
  }
}

describe('legacy entitlement local/test backfill harness', () => {
  it('preserves invited capabilities while changing only authority source', () => {
    const store = createStore()
    const entry = LEGACY_ENTITLEMENT_TEST_MANIFEST[0]
    const beforeEntitlement = resolveEffectiveEntitlement({
      subscriptionType: entry.subscriptionType,
      legacyEntitlements: [],
      now: NOW,
    })
    const beforeCapabilities = resolveUserCapabilities({
      subscriptionType: entry.subscriptionType,
      legacyEntitlements: [],
      now: NOW,
    })

    applyLegacyEntitlementTestBackfill(store, LEGACY_ENTITLEMENT_TEST_MANIFEST)
    const row = store.legacyEntitlements.get(`${entry.userId}:legacy_invited_access`)
    expect(row).toBeDefined()
    const grant = toLegacyEntitlement(row as LegacyEntitlementTestRow, NOW)
    const afterEntitlement = resolveEffectiveEntitlement({
      subscriptionType: null,
      legacyEntitlements: [grant],
      now: NOW,
    })
    const afterCapabilities = resolveUserCapabilities({
      subscriptionType: null,
      legacyEntitlements: [grant],
      now: NOW,
    })

    expect(beforeEntitlement).toEqual({
      type: 'legacy_invited',
      source: 'subscription',
    })
    expect(afterEntitlement).toEqual({
      type: 'legacy_invited',
      source: 'legacy_entitlement',
    })
    expect(beforeCapabilities).toEqual(coachManaged)
    expect(afterCapabilities).toEqual(beforeCapabilities)
  })

  it('is idempotent and never overwrites an existing grant', () => {
    const store = createStore()
    const first = applyLegacyEntitlementTestBackfill(
      store,
      LEGACY_ENTITLEMENT_TEST_MANIFEST,
    )
    const snapshot = Array.from(store.legacyEntitlements.entries())
    const second = applyLegacyEntitlementTestBackfill(
      store,
      LEGACY_ENTITLEMENT_TEST_MANIFEST,
    )

    expect(first.inserted).toHaveLength(2)
    expect(first.skipped).toBe(0)
    expect(second.inserted).toHaveLength(0)
    expect(second.skipped).toBe(2)
    expect(Array.from(store.legacyEntitlements.entries())).toEqual(snapshot)
  })

  it('skips a pre-existing grant without changing any field', () => {
    const store = createStore()
    const entry = LEGACY_ENTITLEMENT_TEST_MANIFEST[0]
    const existing: LegacyEntitlementTestRow = {
      id: '30000000-0000-4000-8000-000000000001',
      userId: entry.userId,
      type: 'legacy_invited_access',
      source: 'admin',
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
      endsAt: null,
      revokedAt: null,
      createdBy: '40000000-0000-4000-8000-000000000001',
      metadata: { reason: 'existing-test-grant' },
    }
    store.legacyEntitlements.set(`${entry.userId}:legacy_invited_access`, existing)

    const receipt = applyLegacyEntitlementTestBackfill(
      store,
      LEGACY_ENTITLEMENT_TEST_MANIFEST,
    )

    expect(receipt.inserted).toHaveLength(1)
    expect(receipt.skipped).toBe(1)
    expect(store.legacyEntitlements.get(
      `${entry.userId}:legacy_invited_access`,
    )).toBe(existing)
  })

  it('ignores expired and revoked grants', () => {
    const grant = activeGrant()
    const expired = {
      ...grant,
      endsAt: new Date('2026-08-24T00:00:00.000Z'),
    }
    const revoked = {
      ...grant,
      revokedAt: new Date('2026-08-24T00:00:00.000Z'),
    }

    for (const legacyEntitlement of [expired, revoked]) {
      expect(resolveEffectiveEntitlement({
        subscriptionType: 'trial',
        legacyEntitlements: [legacyEntitlement],
        now: NOW,
      })).toEqual({ type: 'trial', source: 'subscription' })
    }
  })

  it.each([
    ['client_monthly', 'paid'],
    ['client_lifetime', 'lifetime'],
    ['beta', 'beta'],
  ] as const)('keeps %s above a legacy grant', (subscriptionType, type) => {
    expect(resolveEffectiveEntitlement({
      subscriptionType,
      legacyEntitlements: [activeGrant()],
      now: NOW,
    })).toEqual({
      type,
      source: type === 'beta' ? 'beta' : 'subscription',
    })
    expect(resolveUserCapabilities({
      subscriptionType,
      legacyEntitlements: [activeGrant()],
      now: NOW,
    })).toEqual(unrestricted)
  })

  it('rolls back only rows created by the exact receipt', () => {
    const store = createStore()
    const receipt = applyLegacyEntitlementTestBackfill(
      store,
      LEGACY_ENTITLEMENT_TEST_MANIFEST,
    )
    const protectedEntry = LEGACY_ENTITLEMENT_TEST_MANIFEST[1]
    const protectedKey = `${protectedEntry.userId}:legacy_invited_access`
    const protectedRow = store.legacyEntitlements.get(protectedKey)
    expect(protectedRow).toBeDefined()
    store.legacyEntitlements.set(protectedKey, {
      ...(protectedRow as LegacyEntitlementTestRow),
      metadata: { backfillBatch: 'different-batch' },
    })

    expect(rollbackLegacyEntitlementTestBackfill(store, receipt)).toBe(1)
    expect(store.legacyEntitlements.size).toBe(1)
    expect(store.legacyEntitlements.has(protectedKey)).toBe(true)
  })

  it('uses a bounded synthetic manifest and has no remote or mutation dependency', () => {
    expect(LEGACY_ENTITLEMENT_TEST_MANIFEST).toHaveLength(2)
    expect(LEGACY_ENTITLEMENT_TEST_BATCH).toBe('wave-0d-11-4-local-test-v1')
    for (const entry of LEGACY_ENTITLEMENT_TEST_MANIFEST) {
      expect(entry.subscriptionType).toBe('invited')
      expect(entry.userId).toMatch(/^10000000-0000-4000-8000-/)
    }

    const sources = [
      'tests/fixtures/legacy-entitlement-test-manifest.ts',
      'tests/support/legacy-entitlement-test-backfill.ts',
    ].map(path => readFileSync(path, 'utf8')).join('\n')
    expect(sources).not.toMatch(/supabase|createClient|\.from\(/i)
    expect(sources).not.toMatch(/email|full_name|coach_clients|stripe/i)
    expect(sources).not.toMatch(/\.(?:update|upsert)\(/i)
  })
})
