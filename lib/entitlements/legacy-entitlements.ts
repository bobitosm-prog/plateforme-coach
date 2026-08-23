export type EntitlementSource =
  | 'subscription'
  | 'legacy_invited'
  | 'beta'
  | 'lifetime'
  | 'admin'

export type LegacyEntitlementType = 'legacy_invited_access'

export type LegacyEntitlementOrigin =
  | 'migration'
  | 'admin'
  | 'support_reconciliation'

export interface LegacyEntitlement {
  type: LegacyEntitlementType
  active: boolean
  source: LegacyEntitlementOrigin
  startsAt: Date
  endsAt?: Date | null
  revokedAt?: Date | null
}

/**
 * Future authority order only. The shadow layer does not resolve or grant any
 * capability until persistence, cohort migration and cutover are approved.
 */
export const FUTURE_ENTITLEMENT_PRIORITY = [
  'paid_subscription',
  'lifetime',
  'beta',
  'legacy_invited_access',
  'trial',
  'free',
] as const
