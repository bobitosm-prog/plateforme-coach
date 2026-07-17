export const CACHE_DOMAINS = [
  'identity_session',
  'profile',
  'authorization_subscription',
  'client_dashboard',
  'coach_dashboard_relations',
  'training_progress',
  'nutrition_reference',
  'messaging_athena',
  'invitations',
  'push_notifications',
  'payments_billing',
  'public_catalogs',
] as const

export type CacheDomain = (typeof CACHE_DOMAINS)[number]
export type CacheStorage =
  | 'none'
  | 'memory'
  | 'session_storage'
  | 'local_storage'
  | 'server_cache'
  | 'cache_storage'
export type CacheScope = 'anonymous' | 'user'
export type CacheSensitivity = 'public' | 'private' | 'critical'
export type CacheStrategy =
  | 'network_only'
  | 'network_first'
  | 'cache_first'
  | 'stale_while_revalidate'
export type CacheAuthority = 'server' | 'public_source' | 'local_user_input'

export interface CachePolicy {
  domain: CacheDomain
  keyVersion: number
  sourceOfTruth: string
  storage: readonly CacheStorage[]
  scope: CacheScope
  sensitivity: CacheSensitivity
  strategy: CacheStrategy
  authority: CacheAuthority
  cacheIsAuthoritative: boolean
  freshForMs: number
  retainForMs: number
  allowConfirmedNotFoundCache: boolean
  invalidationEvents: readonly string[]
  noInvalidationReason?: string
  offlineBehavior: string
  networkErrorBehavior: string
}

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const CACHE_POLICY_REGISTRY = [
  {
    domain: 'identity_session',
    keyVersion: 1,
    sourceOfTruth: 'Supabase Auth server session and verified JWT',
    storage: ['none'],
    scope: 'user',
    sensitivity: 'critical',
    strategy: 'network_only',
    authority: 'server',
    cacheIsAuthoritative: false,
    freshForMs: 0,
    retainForMs: 0,
    allowConfirmedNotFoundCache: false,
    invalidationEvents: ['sign_out', 'auth_state_changed', 'identity_changed'],
    offlineBehavior: 'Treat identity as unavailable; never grant access from cached UI state.',
    networkErrorBehavior: 'Return a recoverable authentication error; do not infer a session.',
  },
  {
    domain: 'profile',
    keyVersion: 1,
    sourceOfTruth: 'public.profiles under RLS or a server repository',
    storage: ['memory', 'session_storage'],
    scope: 'user',
    sensitivity: 'private',
    strategy: 'cache_first',
    authority: 'server',
    cacheIsAuthoritative: false,
    freshForMs: 5 * MINUTE,
    retainForMs: 5 * MINUTE,
    allowConfirmedNotFoundCache: true,
    invalidationEvents: ['sign_out', 'identity_changed', 'profile_updated', 'onboarding_completed'],
    offlineBehavior: 'A same-user display snapshot may be shown as stale, never as authorization proof.',
    networkErrorBehavior: 'Preserve the last confirmed profile and expose a retry; never infer absence.',
  },
  {
    domain: 'authorization_subscription',
    keyVersion: 1,
    sourceOfTruth: 'server-verified profile, subscription and active relationship records',
    storage: ['memory'],
    scope: 'user',
    sensitivity: 'critical',
    strategy: 'network_first',
    authority: 'server',
    cacheIsAuthoritative: false,
    freshForMs: 30 * SECOND,
    retainForMs: MINUTE,
    allowConfirmedNotFoundCache: false,
    invalidationEvents: [
      'sign_out',
      'identity_changed',
      'role_changed',
      'subscription_changed',
      'relationship_changed',
    ],
    offlineBehavior: 'Fail closed for protected operations; cached labels are display-only.',
    networkErrorBehavior: 'Do not downgrade an error to no subscription, no role or no relationship.',
  },
  {
    domain: 'client_dashboard',
    keyVersion: 1,
    sourceOfTruth: 'profile, workout, measurement, program and meal-plan tables under RLS',
    storage: ['memory', 'session_storage'],
    scope: 'user',
    sensitivity: 'private',
    strategy: 'cache_first',
    authority: 'server',
    cacheIsAuthoritative: false,
    freshForMs: 5 * MINUTE,
    retainForMs: 5 * MINUTE,
    allowConfirmedNotFoundCache: false,
    invalidationEvents: [
      'sign_out',
      'identity_changed',
      'onboarding_completed',
      'generation_completed',
      'diagnostic_updated',
      'manual_refresh',
    ],
    offlineBehavior: 'Show an explicitly stale same-user snapshot without enabling server mutations.',
    networkErrorBehavior: 'Keep confirmed data, surface the failure and offer retry.',
  },
  {
    domain: 'coach_dashboard_relations',
    keyVersion: 1,
    sourceOfTruth: 'active coach_clients relations and related server-authorized reads',
    storage: ['memory'],
    scope: 'user',
    sensitivity: 'critical',
    strategy: 'network_first',
    authority: 'server',
    cacheIsAuthoritative: false,
    freshForMs: 30 * SECOND,
    retainForMs: 2 * MINUTE,
    allowConfirmedNotFoundCache: false,
    invalidationEvents: ['sign_out', 'identity_changed', 'relationship_changed', 'manual_refresh'],
    offlineBehavior: 'Previously rendered data may remain visible only in the current process; writes fail closed.',
    networkErrorBehavior: 'Do not infer that a relationship is active or absent.',
  },
  {
    domain: 'training_progress',
    keyVersion: 1,
    sourceOfTruth: 'server workout/program records; local drafts are user input pending synchronization',
    storage: ['memory', 'local_storage'],
    scope: 'user',
    sensitivity: 'private',
    strategy: 'network_first',
    authority: 'local_user_input',
    cacheIsAuthoritative: false,
    freshForMs: DAY,
    retainForMs: 7 * DAY,
    allowConfirmedNotFoundCache: false,
    invalidationEvents: [
      'sign_out',
      'identity_changed',
      'workout_completed',
      'draft_discarded',
      'program_changed',
    ],
    offlineBehavior: 'Keep a versioned, user-scoped draft and label it unsynchronized.',
    networkErrorBehavior: 'Retain pending input; never report it as persisted server progress.',
  },
  {
    domain: 'nutrition_reference',
    keyVersion: 1,
    sourceOfTruth: 'nutrition tables and server-generated meal plans under RLS',
    storage: ['memory'],
    scope: 'user',
    sensitivity: 'private',
    strategy: 'network_first',
    authority: 'server',
    cacheIsAuthoritative: false,
    freshForMs: 5 * MINUTE,
    retainForMs: 30 * MINUTE,
    allowConfirmedNotFoundCache: true,
    invalidationEvents: ['sign_out', 'identity_changed', 'meal_plan_changed', 'nutrition_log_changed'],
    offlineBehavior: 'Show stale read-only nutrition data with its last synchronization state.',
    networkErrorBehavior: 'Preserve confirmed data; do not interpret failure as an empty plan.',
  },
  {
    domain: 'messaging_athena',
    keyVersion: 1,
    sourceOfTruth: 'authorized message storage and the server-side Athena provider boundary',
    storage: ['memory'],
    scope: 'user',
    sensitivity: 'private',
    strategy: 'network_first',
    authority: 'server',
    cacheIsAuthoritative: false,
    freshForMs: 0,
    retainForMs: 5 * MINUTE,
    allowConfirmedNotFoundCache: false,
    invalidationEvents: ['sign_out', 'identity_changed', 'message_sent', 'conversation_deleted'],
    offlineBehavior: 'Do not persist prompts or full conversations as an application cache.',
    networkErrorBehavior: 'Expose send/generation failure without synthesizing a provider response.',
  },
  {
    domain: 'invitations',
    keyVersion: 1,
    sourceOfTruth: 'single-use server invitation contract and PostgreSQL RPC',
    storage: ['none'],
    scope: 'anonymous',
    sensitivity: 'critical',
    strategy: 'network_only',
    authority: 'server',
    cacheIsAuthoritative: false,
    freshForMs: 0,
    retainForMs: 0,
    allowConfirmedNotFoundCache: false,
    invalidationEvents: ['invitation_consumed', 'invitation_expired', 'invitation_revoked', 'navigation_completed'],
    offlineBehavior: 'Invitation verification is unavailable offline.',
    networkErrorBehavior: 'Keep the error distinct from invalid or consumed; never cache the token.',
  },
  {
    domain: 'push_notifications',
    keyVersion: 1,
    sourceOfTruth: 'browser PushManager plus server push_subscriptions under authorization checks',
    storage: ['none'],
    scope: 'user',
    sensitivity: 'critical',
    strategy: 'network_only',
    authority: 'server',
    cacheIsAuthoritative: false,
    freshForMs: 0,
    retainForMs: 0,
    allowConfirmedNotFoundCache: false,
    invalidationEvents: ['sign_out', 'identity_changed', 'subscription_revoked', 'push_gone'],
    offlineBehavior: 'Rely only on browser push delivery; do not duplicate endpoints or payloads in app storage.',
    networkErrorBehavior: 'Report subscription/delivery failure without assuming authorization.',
  },
  {
    domain: 'payments_billing',
    keyVersion: 1,
    sourceOfTruth: 'Stripe plus server reconciled payments/subscriptions protected by RLS',
    storage: ['none'],
    scope: 'user',
    sensitivity: 'critical',
    strategy: 'network_only',
    authority: 'server',
    cacheIsAuthoritative: false,
    freshForMs: 0,
    retainForMs: 0,
    allowConfirmedNotFoundCache: false,
    invalidationEvents: ['checkout_completed', 'webhook_received', 'subscription_changed', 'refund_received'],
    offlineBehavior: 'Billing state and paid access cannot be established offline.',
    networkErrorBehavior: 'Return pending/unknown; never infer paid, lifetime or entitled state.',
  },
  {
    domain: 'public_catalogs',
    keyVersion: 1,
    sourceOfTruth: 'versioned public exercise, recipe and localization catalogs',
    storage: ['memory', 'server_cache', 'cache_storage'],
    scope: 'anonymous',
    sensitivity: 'public',
    strategy: 'stale_while_revalidate',
    authority: 'public_source',
    cacheIsAuthoritative: false,
    freshForMs: HOUR,
    retainForMs: DAY,
    allowConfirmedNotFoundCache: true,
    invalidationEvents: ['catalog_version_changed', 'deployment_activated'],
    offlineBehavior: 'A versioned stale public catalog may be used until its retention limit.',
    networkErrorBehavior: 'Use a retained public version or expose unavailability.',
  },
] as const satisfies readonly CachePolicy[]

export function validateCachePolicies(policies: readonly CachePolicy[]): string[] {
  const errors: string[] = []
  const seen = new Set<string>()

  for (const policy of policies) {
    const prefix = policy.domain
    if (seen.has(policy.domain)) errors.push(`${prefix}: duplicate domain`)
    seen.add(policy.domain)

    if (!Number.isInteger(policy.keyVersion) || policy.keyVersion < 1) {
      errors.push(`${prefix}: keyVersion must be a positive integer`)
    }
    if (!Number.isFinite(policy.freshForMs) || policy.freshForMs < 0) {
      errors.push(`${prefix}: freshForMs must be finite and non-negative`)
    }
    if (!Number.isFinite(policy.retainForMs) || policy.retainForMs < 0) {
      errors.push(`${prefix}: retainForMs must be finite and non-negative`)
    }
    if (policy.freshForMs > policy.retainForMs) {
      errors.push(`${prefix}: freshForMs cannot exceed retainForMs`)
    }
    if (policy.storage.length === 0) errors.push(`${prefix}: storage is required`)
    if (policy.storage.includes('none') && policy.storage.length > 1) {
      errors.push(`${prefix}: none cannot be combined with another storage`)
    }
    if (policy.sensitivity === 'private' && policy.scope !== 'user') {
      errors.push(`${prefix}: private data must be user-scoped`)
    }
    const browserPersistence = policy.storage.some((storage) =>
      ['session_storage', 'local_storage', 'cache_storage'].includes(storage),
    )
    if (policy.sensitivity === 'critical' && browserPersistence) {
      errors.push(`${prefix}: critical data cannot use persistent browser storage`)
    }
    if (policy.scope === 'user' && browserPersistence) {
      for (const event of ['sign_out', 'identity_changed']) {
        if (!policy.invalidationEvents.includes(event)) {
          errors.push(`${prefix}: persistent user cache must invalidate on ${event}`)
        }
      }
    }
    if (policy.authority === 'server' && policy.cacheIsAuthoritative) {
      errors.push(`${prefix}: a cache cannot replace server authority`)
    }
    if (policy.invalidationEvents.length === 0 && !policy.noInvalidationReason?.trim()) {
      errors.push(`${prefix}: invalidation events or a justification are required`)
    }
  }

  for (const domain of CACHE_DOMAINS) {
    if (!seen.has(domain)) errors.push(`${domain}: required domain is missing`)
  }

  return errors
}

export interface CacheEnvelope<T> {
  keyVersion: number
  ownerUserId?: string
  storedAt: number
  freshUntil: number
  expiresAt: number
  kind: 'value' | 'confirmed_not_found' | 'error'
  data: T
}

export type CacheEnvelopeAssessment =
  | { status: 'fresh' | 'stale' }
  | {
      status: 'rejected'
      reason: 'version' | 'owner' | 'expired' | 'error' | 'negative_cache_forbidden' | 'invalid_time'
    }

export function assessCacheEnvelope<T>(
  policy: CachePolicy,
  envelope: CacheEnvelope<T>,
  context: { now: () => number; userId?: string },
): CacheEnvelopeAssessment {
  if (envelope.kind === 'error') return { status: 'rejected', reason: 'error' }
  if (envelope.keyVersion !== policy.keyVersion) return { status: 'rejected', reason: 'version' }
  if (policy.scope === 'user' && (!context.userId || envelope.ownerUserId !== context.userId)) {
    return { status: 'rejected', reason: 'owner' }
  }
  if (envelope.kind === 'confirmed_not_found' && !policy.allowConfirmedNotFoundCache) {
    return { status: 'rejected', reason: 'negative_cache_forbidden' }
  }

  const now = context.now()
  if (![envelope.storedAt, envelope.freshUntil, envelope.expiresAt, now].every(Number.isFinite)) {
    return { status: 'rejected', reason: 'invalid_time' }
  }
  if (envelope.freshUntil < envelope.storedAt || envelope.expiresAt < envelope.freshUntil) {
    return { status: 'rejected', reason: 'invalid_time' }
  }
  if (now >= envelope.expiresAt) return { status: 'rejected', reason: 'expired' }
  return { status: now < envelope.freshUntil ? 'fresh' : 'stale' }
}

export function createCacheKey(
  policy: CachePolicy,
  options: { userId?: string; resource?: string } = {},
): string {
  if (policy.scope === 'user' && !options.userId) {
    throw new Error(`${policy.domain}: userId is required for a user-scoped cache key`)
  }
  const owner = policy.scope === 'user' ? options.userId : 'public'
  const resource = options.resource ? `:${encodeURIComponent(options.resource)}` : ''
  return `moovx-cache:v${policy.keyVersion}:${policy.domain}:${owner}${resource}`
}

export function getCachePolicy(domain: CacheDomain): CachePolicy {
  const policy = CACHE_POLICY_REGISTRY.find((candidate) => candidate.domain === domain)
  if (!policy) throw new Error(`Unknown cache domain: ${domain}`)
  return policy
}
