export type ConnectErrorCode =
  | 'INVALID_REQUEST'
  | 'IDENTITY_MISMATCH'
  | 'PROFILE_UNAVAILABLE'
  | 'ROLE_FORBIDDEN'
  | 'STRIPE_NOT_CONFIGURED'
  | 'SERVER_MISCONFIGURED'
  | 'PROVIDER_ERROR'

export class ConnectServiceError extends Error {
  constructor(public readonly code: ConnectErrorCode) {
    super(code)
    this.name = 'ConnectServiceError'
  }
}

export interface ConnectCoachProfile {
  role: string | null
  email: string | null
  stripeAccountId: string | null
}

export interface ConnectAccountStatus {
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  requirements: string[]
}

export interface StripeConnectPort {
  createAccount(input: {
    coachId: string
    email?: string
    idempotencyKey: string
  }): Promise<{ id: string }>
  createAccountLink(input: {
    accountId: string
    refreshUrl: string
    returnUrl: string
  }): Promise<{ url: string }>
  retrieveAccount(accountId: string): Promise<ConnectAccountStatus>
}

export interface ConnectRepository {
  findAccountId(coachId: string): Promise<string | null>
  claimAccountId(coachId: string, accountId: string): Promise<string | null>
}

export function readRequestedCoachId(body: unknown): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ConnectServiceError('INVALID_REQUEST')
  const coachId = (body as Record<string, unknown>).coachId
  if (typeof coachId !== 'string' || !coachId) throw new ConnectServiceError('INVALID_REQUEST')
  return coachId
}

export function assertCoachAuthority(input: {
  authenticatedUserId: string
  requestedCoachId: string
  profile: ConnectCoachProfile | null
}): ConnectCoachProfile {
  if (input.requestedCoachId !== input.authenticatedUserId) throw new ConnectServiceError('IDENTITY_MISMATCH')
  if (!input.profile) throw new ConnectServiceError('PROFILE_UNAVAILABLE')
  if (input.profile.role !== 'coach') throw new ConnectServiceError('ROLE_FORBIDDEN')
  return input.profile
}

export async function createConnectOnboarding(input: {
  coachId: string
  profileEmail: string | null
  sessionEmail: string | null
  storedAccountId: string | null
  appUrl: string
  stripe: StripeConnectPort
  repository: ConnectRepository
}): Promise<{ url: string; accountId: string }> {
  let accountId = input.storedAccountId

  if (!accountId) {
    accountId = await input.repository.findAccountId(input.coachId)
  }
  if (!accountId) {
    const created = await input.stripe.createAccount({
      coachId: input.coachId,
      email: input.profileEmail || input.sessionEmail || undefined,
      idempotencyKey: `connect-account-${input.coachId}`,
    })
    accountId = created.id
    const claimedAccountId = await input.repository.claimAccountId(input.coachId, accountId)
    if (claimedAccountId) {
      accountId = claimedAccountId
    } else {
      accountId = await input.repository.findAccountId(input.coachId) || accountId
    }
  }

  const accountLink = await input.stripe.createAccountLink({
    accountId,
    refreshUrl: `${input.appUrl}/?stripe=refresh`,
    returnUrl: `${input.appUrl}/?stripe=success&account=${accountId}`,
  })
  return { url: accountLink.url, accountId }
}

export async function readConnectStatus(input: {
  accountId: string | null
  stripe: StripeConnectPort
}): Promise<
  | { connected: false; status: 'no_account' }
  | {
      connected: boolean
      status: 'active' | 'incomplete'
      charges_enabled: boolean
      payouts_enabled: boolean
      details_submitted: boolean
      requirements: string[]
    }
> {
  if (!input.accountId) return { connected: false, status: 'no_account' }
  const account = await input.stripe.retrieveAccount(input.accountId)
  return {
    connected: account.chargesEnabled && account.payoutsEnabled,
    status: account.chargesEnabled ? 'active' : 'incomplete',
    charges_enabled: account.chargesEnabled,
    payouts_enabled: account.payoutsEnabled,
    details_submitted: account.detailsSubmitted,
    requirements: account.requirements,
  }
}
