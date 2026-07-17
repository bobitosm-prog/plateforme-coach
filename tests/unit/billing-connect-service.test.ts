import { describe, expect, it, vi } from 'vitest'
import {
  ConnectServiceError,
  assertCoachAuthority,
  createConnectOnboarding,
  readConnectStatus,
  readRequestedCoachId,
  type ConnectRepository,
  type StripeConnectPort,
} from '@/lib/billing/connect'

const COACH_ID = '00000000-0000-4000-8000-000000000001'

function connectHarness() {
  const stripe: StripeConnectPort = {
    createAccount: vi.fn(async () => ({ id: 'acct_created' })),
    createAccountLink: vi.fn(async () => ({ url: 'https://connect.example.test/onboarding' })),
    retrieveAccount: vi.fn(async () => ({
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      requirements: [],
    })),
  }
  const repository: ConnectRepository = {
    findAccountId: vi.fn(async () => null),
    claimAccountId: vi.fn(async (_coachId, accountId) => accountId),
  }
  return { stripe, repository }
}

describe('Stripe Connect authority', () => {
  it('requires the legacy coachId field but never accepts it as authority', () => {
    expect(readRequestedCoachId({ coachId: COACH_ID, existingAccountId: 'acct_foreign' })).toBe(COACH_ID)
    expect(() => readRequestedCoachId({})).toThrowError(new ConnectServiceError('INVALID_REQUEST'))
    expect(() => assertCoachAuthority({
      authenticatedUserId: COACH_ID,
      requestedCoachId: '00000000-0000-4000-8000-000000000002',
      profile: { role: 'coach', email: null, stripeAccountId: null },
    })).toThrowError(new ConnectServiceError('IDENTITY_MISMATCH'))
  })

  it.each(['client', 'invited', 'admin'])("rejects the non-coach role '%s'", role => {
    expect(() => assertCoachAuthority({
      authenticatedUserId: COACH_ID,
      requestedCoachId: COACH_ID,
      profile: { role, email: null, stripeAccountId: null },
    })).toThrowError(new ConnectServiceError('ROLE_FORBIDDEN'))
  })

  it('rejects a missing coach profile', () => {
    expect(() => assertCoachAuthority({
      authenticatedUserId: COACH_ID,
      requestedCoachId: COACH_ID,
      profile: null,
    })).toThrowError(new ConnectServiceError('PROFILE_UNAVAILABLE'))
  })
})

describe('Stripe Connect onboarding service', () => {
  it('creates and persists an Express account before producing the legacy account link', async () => {
    const { stripe, repository } = connectHarness()
    const result = await createConnectOnboarding({
      coachId: COACH_ID,
      profileEmail: 'coach@example.test',
      sessionEmail: 'session@example.test',
      storedAccountId: null,
      appUrl: 'http://app.example.test',
      stripe,
      repository,
    })

    expect(result).toEqual({ url: 'https://connect.example.test/onboarding', accountId: 'acct_created' })
    expect(stripe.createAccount).toHaveBeenCalledWith({
      coachId: COACH_ID,
      email: 'coach@example.test',
      idempotencyKey: `connect-account-${COACH_ID}`,
    })
    expect(repository.claimAccountId).toHaveBeenCalledWith(COACH_ID, 'acct_created')
    expect(stripe.createAccountLink).toHaveBeenCalledWith({
      accountId: 'acct_created',
      refreshUrl: 'http://app.example.test/?stripe=refresh',
      returnUrl: 'http://app.example.test/?stripe=success&account=acct_created',
    })
  })

  it('reuses the account stored on the authenticated profile without mutation', async () => {
    const { stripe, repository } = connectHarness()
    await createConnectOnboarding({
      coachId: COACH_ID,
      profileEmail: null,
      sessionEmail: null,
      storedAccountId: 'acct_stored',
      appUrl: 'http://app.example.test',
      stripe,
      repository,
    })

    expect(repository.findAccountId).not.toHaveBeenCalled()
    expect(repository.claimAccountId).not.toHaveBeenCalled()
    expect(stripe.createAccount).not.toHaveBeenCalled()
    expect(stripe.createAccountLink).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'acct_stored' }))
  })

  it('uses the account that won a concurrent conditional update', async () => {
    const { stripe, repository } = connectHarness()
    vi.mocked(repository.claimAccountId).mockResolvedValue(null)
    vi.mocked(repository.findAccountId)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('acct_race_winner')

    const result = await createConnectOnboarding({
      coachId: COACH_ID,
      profileEmail: null,
      sessionEmail: 'session@example.test',
      storedAccountId: null,
      appUrl: 'http://app.example.test',
      stripe,
      repository,
    })

    expect(result.accountId).toBe('acct_race_winner')
    expect(stripe.createAccountLink).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'acct_race_winner' }))
  })
})

describe('Stripe Connect status service', () => {
  it('does not call Stripe when the server profile has no account', async () => {
    const { stripe } = connectHarness()
    await expect(readConnectStatus({ accountId: null, stripe })).resolves.toEqual({ connected: false, status: 'no_account' })
    expect(stripe.retrieveAccount).not.toHaveBeenCalled()
  })

  it('maps the account state without exposing the provider object', async () => {
    const { stripe } = connectHarness()
    vi.mocked(stripe.retrieveAccount).mockResolvedValue({
      chargesEnabled: true,
      payoutsEnabled: false,
      detailsSubmitted: false,
      requirements: ['individual.verification.document'],
    })
    await expect(readConnectStatus({ accountId: 'acct_server', stripe })).resolves.toEqual({
      connected: false,
      status: 'active',
      charges_enabled: true,
      payouts_enabled: false,
      details_submitted: false,
      requirements: ['individual.verification.document'],
    })
    expect(stripe.retrieveAccount).toHaveBeenCalledWith('acct_server')
  })
})
