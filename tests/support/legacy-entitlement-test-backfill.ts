import type { LegacyEntitlement } from '@/lib/entitlements/legacy-entitlements'
import {
  LEGACY_ENTITLEMENT_TEST_BATCH,
  LEGACY_ENTITLEMENT_TEST_STARTS_AT,
  type LegacyEntitlementTestManifestEntry,
} from '@/tests/fixtures/legacy-entitlement-test-manifest'

const MAX_TEST_MANIFEST_SIZE = 10

export type LegacyEntitlementTestProfile = {
  id: string
  subscriptionType: string | null
}

export type LegacyEntitlementTestRow = {
  id: string
  userId: string
  type: 'legacy_invited_access'
  source: 'migration' | 'admin' | 'support_reconciliation'
  startsAt: Date
  endsAt: Date | null
  revokedAt: Date | null
  createdBy: string | null
  metadata: Readonly<Record<string, string>>
}

export type LegacyEntitlementTestStore = {
  profiles: Map<string, LegacyEntitlementTestProfile>
  legacyEntitlements: Map<string, LegacyEntitlementTestRow>
}

export type LegacyEntitlementTestBackfillReceipt = {
  batch: string
  inserted: readonly { id: string; userId: string }[]
  skipped: number
}

function entitlementKey(userId: string): string {
  return `${userId}:legacy_invited_access`
}

function validateManifest(
  manifest: readonly LegacyEntitlementTestManifestEntry[],
  store: LegacyEntitlementTestStore,
): void {
  if (manifest.length === 0 || manifest.length > MAX_TEST_MANIFEST_SIZE) {
    throw new Error('LEGACY_TEST_MANIFEST_OUT_OF_BOUNDS')
  }

  const userIds = new Set<string>()
  const grantIds = new Set<string>()
  for (const entry of manifest) {
    if (userIds.has(entry.userId) || grantIds.has(entry.grantId)) {
      throw new Error('LEGACY_TEST_MANIFEST_DUPLICATE')
    }
    userIds.add(entry.userId)
    grantIds.add(entry.grantId)

    const profile = store.profiles.get(entry.userId)
    if (
      profile?.id !== entry.userId
      || profile.subscriptionType !== entry.subscriptionType
    ) {
      throw new Error('LEGACY_TEST_MANIFEST_PROFILE_MISMATCH')
    }
  }
}

/**
 * In-memory equivalent of INSERT ... ON CONFLICT DO NOTHING. It is deliberately
 * test-only: no database client, profile mutation or remote connection exists.
 */
export function applyLegacyEntitlementTestBackfill(
  store: LegacyEntitlementTestStore,
  manifest: readonly LegacyEntitlementTestManifestEntry[],
): LegacyEntitlementTestBackfillReceipt {
  validateManifest(manifest, store)

  const inserted: { id: string; userId: string }[] = []
  let skipped = 0
  for (const entry of manifest) {
    const key = entitlementKey(entry.userId)
    if (store.legacyEntitlements.has(key)) {
      skipped += 1
      continue
    }

    const row: LegacyEntitlementTestRow = {
      id: entry.grantId,
      userId: entry.userId,
      type: 'legacy_invited_access',
      source: 'migration',
      startsAt: new Date(LEGACY_ENTITLEMENT_TEST_STARTS_AT),
      endsAt: null,
      revokedAt: null,
      createdBy: null,
      metadata: { backfillBatch: LEGACY_ENTITLEMENT_TEST_BATCH },
    }
    store.legacyEntitlements.set(key, row)
    inserted.push({ id: row.id, userId: row.userId })
  }

  return { batch: LEGACY_ENTITLEMENT_TEST_BATCH, inserted, skipped }
}

/** Removes only rows inserted by the exact receipt and unchanged batch marker. */
export function rollbackLegacyEntitlementTestBackfill(
  store: LegacyEntitlementTestStore,
  receipt: LegacyEntitlementTestBackfillReceipt,
): number {
  let removed = 0
  for (const inserted of receipt.inserted) {
    const key = entitlementKey(inserted.userId)
    const row = store.legacyEntitlements.get(key)
    if (
      row?.id === inserted.id
      && row.type === 'legacy_invited_access'
      && row.source === 'migration'
      && row.metadata.backfillBatch === receipt.batch
    ) {
      store.legacyEntitlements.delete(key)
      removed += 1
    }
  }
  return removed
}

export function toLegacyEntitlement(
  row: LegacyEntitlementTestRow,
  now: Date,
): LegacyEntitlement {
  const startsAt = row.startsAt.getTime()
  const endsAt = row.endsAt?.getTime()
  const active = row.revokedAt === null
    && startsAt <= now.getTime()
    && (endsAt == null || endsAt > now.getTime())

  return {
    type: row.type,
    active,
    source: row.source,
    startsAt: new Date(row.startsAt),
    endsAt: row.endsAt === null ? null : new Date(row.endsAt),
    revokedAt: row.revokedAt === null ? null : new Date(row.revokedAt),
  }
}
