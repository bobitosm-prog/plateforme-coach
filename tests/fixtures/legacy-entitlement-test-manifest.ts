export const LEGACY_ENTITLEMENT_TEST_BATCH = 'wave-0d-11-4-local-test-v1'
export const LEGACY_ENTITLEMENT_TEST_STARTS_AT = '2026-08-23T12:00:00.000Z'

export type LegacyEntitlementTestManifestEntry = {
  userId: string
  grantId: string
  subscriptionType: 'invited'
}

/**
 * Synthetic IDs only. This bounded manifest must never be populated from a
 * profile query or reused against a remote environment.
 */
export const LEGACY_ENTITLEMENT_TEST_MANIFEST = [
  {
    userId: '10000000-0000-4000-8000-000000000001',
    grantId: '20000000-0000-4000-8000-000000000001',
    subscriptionType: 'invited',
  },
  {
    userId: '10000000-0000-4000-8000-000000000002',
    grantId: '20000000-0000-4000-8000-000000000002',
    subscriptionType: 'invited',
  },
] as const satisfies readonly LegacyEntitlementTestManifestEntry[]
