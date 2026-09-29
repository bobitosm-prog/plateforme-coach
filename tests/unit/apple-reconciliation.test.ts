import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest'
import { Environment, SignedDataVerifier, Status, Type } from '@apple/app-store-server-library'
import { createAppleTestChain } from './helpers/apple-test-chain'
import { reconcileApplePurchase } from '@/lib/apple/reconciliation'
import { verifyAppleTransaction } from '@/lib/apple/transaction-verification'
vi.mock('server-only', () => ({}))
let chain: ReturnType<typeof createAppleTestChain>
let verifier: SignedDataVerifier
let now: number
const token = '00000000-0000-4000-8000-000000000001'
const context = { environment: Environment.SANDBOX as const, expectedAccountToken: token }
const payload = () => ({ environment: 'Sandbox', bundleId: 'ch.moovx.app',
  productId: 'ch.moovx.app.athena.monthly', type: Type.AUTO_RENEWABLE_SUBSCRIPTION,
  subscriptionGroupIdentifier: '22425039', quantity: 1, inAppOwnershipType: 'PURCHASED',
  transactionId: '100', originalTransactionId: '100', appAccountToken: token,
  purchaseDate: now - 10000, signedDate: now, expiresDate: now + 10000 })
beforeAll(() => {
  chain = createAppleTestChain(); now = Date.now()
  verifier = new SignedDataVerifier([chain.root], false, Environment.SANDBOX, 'ch.moovx.app', 6815356426)
})
afterEach(() => vi.useRealTimers())
async function fixture(status: number = Status.ACTIVE, patch: object = {}) {
  const signed = chain.sign({ ...payload(), ...patch })
  const seed = await verifyAppleTransaction(signed, context, verifier)
  const entry = { status, originalTransactionId: '100', signedTransactionInfo: signed, signedRenewalInfo: '' }
  const response = { environment: Environment.SANDBOX, bundleId: 'ch.moovx.app',
    data: [{ subscriptionGroupIdentifier: '22425039', lastTransactions: [entry] }] }
  const api = {
    getTransactionInfo: vi.fn().mockResolvedValue({ signedTransactionInfo: signed }),
    getAllSubscriptionStatuses: vi.fn().mockResolvedValue(response),
  }
  return { seed, entry, response, api, run: () => reconcileApplePurchase(seed, context, { api, verifier }) }
}
describe('Apple live-state reconciliation (mock transport, real signed JWS)', () => {
  it('keeps paid access until Apple expiry, independent of auto-renew cancellation', async () => {
    const f = await fixture()
    expect(await f.run()).toMatchObject({ state: 'active', accessUntil: now + 10000 })
    expect(f.api.getAllSubscriptionStatuses).toHaveBeenCalledWith('100')
  })
  it.each([[Status.EXPIRED, 'expired'], [Status.BILLING_RETRY, 'billing_retry'], [Status.REVOKED, 'revoked']] as const)
    ('handles Apple status %s', async (status, state) => {
      expect(await (await fixture(status)).run()).toMatchObject({ state, accessUntil: null })
    })
  it('does not grant expired active evidence or replaced transactions', async () => {
    expect(await (await fixture(Status.ACTIVE, { expiresDate: now - 1 })).run()).toMatchObject({ state: 'expired', accessUntil: null })
    expect(await (await fixture(Status.ACTIVE, { isUpgraded: true })).run()).toMatchObject({ state: 'replaced', accessUntil: null })
  })
  it('finds the latest renewal from an old transaction', async () => {
    const f = await fixture(Status.ACTIVE, { expiresDate: now - 1 })
    f.entry.signedTransactionInfo = chain.sign({ ...payload(), transactionId: '101', purchaseDate: now - 1, signedDate: now + 1 })
    expect(await f.run()).toMatchObject({ state: 'active', transaction: { transactionId: '101' } })
  })
  it('prioritizes a signed refund over active status', async () => {
    const f = await fixture()
    f.entry.signedTransactionInfo = chain.sign({ ...payload(), revocationDate: now - 1 })
    expect(await f.run()).toMatchObject({ state: 'revoked', accessUntil: null })
  })
  it.each([false, true])('checks lifetime purchase through Apple; refunded=%s', async refunded => {
    const f = await fixture(Status.ACTIVE, { productId: 'ch.moovx.app.athena.lifetime', type: Type.NON_CONSUMABLE,
      expiresDate: undefined, ...(refunded ? { revocationDate: now - 1 } : {}) })
    expect(await f.run()).toMatchObject({ state: refunded ? 'revoked' : 'lifetime', accessUntil: null })
    expect(f.api.getAllSubscriptionStatuses).not.toHaveBeenCalled()
  })
  it('uses only a verified grace deadline from matching renewal info', async () => {
    const f = await fixture(Status.BILLING_GRACE_PERIOD, { expiresDate: now - 1000 })
    f.entry.signedRenewalInfo = chain.sign({ environment: 'Sandbox', originalTransactionId: '100',
      productId: payload().productId, signedDate: now, gracePeriodExpiresDate: now + 5000 })
    expect(await f.run()).toMatchObject({ state: 'grace', accessUntil: now + 5000 })
    f.entry.signedRenewalInfo = chain.sign({ environment: 'Sandbox', originalTransactionId: '200',
      productId: payload().productId, signedDate: now, gracePeriodExpiresDate: now + 5000 })
    await expect(f.run()).rejects.toThrow('APPLE_RECONCILIATION_INVALID')
  })
  it('rejects absent or tampered grace evidence', async () => {
    const f = await fixture(Status.BILLING_GRACE_PERIOD)
    await expect(f.run()).rejects.toThrow('APPLE_RECONCILIATION_INVALID')
    f.entry.signedRenewalInfo = 'invalid.jwt.signature'
    await expect(f.run()).rejects.toThrow('APPLE_RECONCILIATION_INVALID')
  })
  it.each([{ bundleId: 'wrong.app' }, { environment: Environment.PRODUCTION }, { data: [] }])
    ('rejects mismatched or incomplete response %j', async patch => {
      const f = await fixture(); Object.assign(f.response, patch)
      await expect(f.run()).rejects.toThrow('APPLE_RECONCILIATION_INVALID')
    })
  it.each([{ originalTransactionId: '200' }, { appAccountToken: '00000000-0000-4000-8000-000000000002' }, { signedDate: 1 }])
    ('rejects unbound or older latest evidence %j', async patch => {
      const f = await fixture(); f.entry.signedTransactionInfo = chain.sign({ ...payload(), ...patch })
      await expect(f.run()).rejects.toThrow()
    })
  it('rejects a different transaction returned by transaction lookup', async () => {
    const f = await fixture()
    f.api.getTransactionInfo.mockResolvedValue({ signedTransactionInfo: chain.sign({ ...payload(), transactionId: '999' }) })
    await expect(f.run()).rejects.toThrow('APPLE_RECONCILIATION_INVALID')
  })
  it('rejects ambiguous matches and unknown statuses', async () => {
    const f = await fixture(99)
    await expect(f.run()).rejects.toThrow('APPLE_RECONCILIATION_INVALID')
    f.response.data[0].lastTransactions.push(f.entry)
    await expect(f.run()).rejects.toThrow('APPLE_RECONCILIATION_INVALID')
  })
  it('redacts API failures and never falls back to client evidence', async () => {
    const f = await fixture(); f.api.getTransactionInfo.mockRejectedValue(new Error('sensitive Apple failure'))
    await expect(f.run()).rejects.toThrow('APPLE_RECONCILIATION_UNAVAILABLE')
    expect(f.api.getAllSubscriptionStatuses).not.toHaveBeenCalled()
  })
  it('bounds API wait without allowing late results to grant anything', async () => {
    const f = await fixture(); vi.useFakeTimers()
    f.api.getTransactionInfo.mockReturnValue(new Promise(() => {}))
    const assertion = expect(f.run()).rejects.toThrow('APPLE_RECONCILIATION_UNAVAILABLE')
    await vi.advanceTimersByTimeAsync(15000); await assertion
  })
})
