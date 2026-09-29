import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Environment, SignedDataVerifier, Status, Type } from '@apple/app-store-server-library'
import { createAppleTestChain } from './helpers/apple-test-chain'
import { processOneAppleNotification, type AppleWorkerDependencies } from '@/lib/apple/notification-worker'
import { verifyAppleNotification } from '@/lib/apple/notification-verification'
import { verifyAppleTransaction, type AppleEnvironment } from '@/lib/apple/transaction-verification'
import { reconcileApplePurchase } from '@/lib/apple/reconciliation'
vi.mock('server-only', () => ({}))
let chain: ReturnType<typeof createAppleTestChain>
let verifier: SignedDataVerifier
const token = '00000000-0000-4000-8000-000000000001'
const user = '00000000-0000-4000-8000-000000000002'
const id = '00000000-0000-4000-8000-000000000003'
beforeAll(() => {
  chain = createAppleTestChain()
  verifier = new SignedDataVerifier([chain.root], false, Environment.SANDBOX, 'ch.moovx.app', 6815356426)
})
function fixture(type = 'DID_RENEW', txPatch: object = {}) {
  const now = Date.now()
  const jws = chain.sign({ environment: 'Sandbox', bundleId: 'ch.moovx.app',
    productId: 'ch.moovx.app.athena.monthly', type: Type.AUTO_RENEWABLE_SUBSCRIPTION,
    subscriptionGroupIdentifier: '22425039', quantity: 1, inAppOwnershipType: 'PURCHASED',
    transactionId: '100', originalTransactionId: '100', appAccountToken: token,
    purchaseDate: now - 1000, signedDate: now, expiresDate: now + 3600000, ...txPatch })
  const event = { environment: Environment.SANDBOX as AppleEnvironment, notificationId: id,
    leaseToken: '00000000-0000-4000-8000-000000000004', signedPayload: chain.sign({
      notificationUUID: id, notificationType: type, version: '2.0', signedDate: now,
      data: { environment: 'Sandbox', bundleId: 'ch.moovx.app', appAppleId: 6815356426, signedTransactionInfo: jws },
    }) }
  const api = {
    getTransactionInfo: vi.fn().mockResolvedValue({ signedTransactionInfo: jws }),
    getAllSubscriptionStatuses: vi.fn().mockResolvedValue({ environment: 'Sandbox', bundleId: 'ch.moovx.app',
      data: [{ subscriptionGroupIdentifier: '22425039', lastTransactions: [{ status: Status.ACTIVE,
        originalTransactionId: '100', signedTransactionInfo: jws }] }] }),
  }
  const complete = vi.fn().mockResolvedValue('processed')
  const fail = vi.fn().mockResolvedValue(undefined)
  const binding = vi.fn().mockResolvedValue(user)
  const deps: AppleWorkerDependencies = {
    claim: vi.fn().mockResolvedValue(event),
    envelope: (signed, env) => verifyAppleNotification(signed, env, verifier),
    decode: signed => verifier.verifyAndDecodeTransaction(signed),
    binding,
    transaction: (signed, context) => verifyAppleTransaction(signed, context, verifier),
    reconcile: (seed, context) => reconcileApplePurchase(seed, context, { api, verifier }),
    complete, fail,
  }
  return { event, deps, api, complete, fail, binding,
    run: () => processOneAppleNotification(Environment.SANDBOX, deps) }
}
describe('Apple worker, real envelope and nested signature verification', () => {
  it('reconciles through Apple and atomically completes for the bound user', async () => {
    const f = fixture()
    expect(await f.run()).toBe('processed')
    expect(f.binding).toHaveBeenCalledWith(Environment.SANDBOX, token)
    expect(f.complete).toHaveBeenCalledWith(f.event, user, expect.objectContaining({ state: 'active' }))
    expect(f.fail).not.toHaveBeenCalled()
  })
  it('does not interpret a REFUND label as current truth without consulting Apple', async () => {
    const f = fixture('REFUND')
    expect(await f.run()).toBe('processed')
    expect(f.api.getAllSubscriptionStatuses).toHaveBeenCalledOnce()
    expect(f.complete).toHaveBeenCalledWith(f.event, user, expect.objectContaining({ state: 'active' }))
  })
  it('records a confirmed refund', async () => {
    const f = fixture('REFUND', { revocationDate: Date.now() - 1 })
    expect(await f.run()).toBe('processed')
    expect(f.complete).toHaveBeenCalledWith(f.event, user, expect.objectContaining({ state: 'revoked', accessUntil: null }))
  })
  it('returns idle without network work when the queue is empty', async () => {
    const f = fixture(); f.deps.claim = async () => null
    expect(await f.run()).toBe('idle')
    expect(f.api.getTransactionInfo).not.toHaveBeenCalled()
  })
  it('quarantines an unbound account without granting or transferring ownership', async () => {
    const f = fixture(); f.binding.mockResolvedValue(null)
    expect(await f.run()).toBe('quarantined')
    expect(f.fail).toHaveBeenCalledWith(f.event, false, 'APPLE_UNBOUND_ACCOUNT')
    expect(f.complete).not.toHaveBeenCalled()
  })
  it('retries lookup outages rather than confusing them with a missing account', async () => {
    const f = fixture(); f.binding.mockRejectedValue(new Error('database unavailable'))
    expect(await f.run()).toBe('retry')
    expect(f.fail).toHaveBeenCalledWith(f.event, true, 'APPLE_PROCESSING_UNAVAILABLE')
  })
  it('does not finish or revoke anything when Apple is unavailable', async () => {
    const f = fixture(); f.api.getTransactionInfo.mockRejectedValue(new Error('private transport error'))
    expect(await f.run()).toBe('retry')
    expect(f.complete).not.toHaveBeenCalled()
    expect(f.fail).toHaveBeenCalledWith(f.event, true, 'APPLE_PROCESSING_UNAVAILABLE')
  })
  it('retries an atomic commit failure', async () => {
    const f = fixture(); f.complete.mockRejectedValue(new Error('commit failed'))
    expect(await f.run()).toBe('retry')
    expect(f.fail).toHaveBeenCalledOnce()
  })
  it('returns stale when a newer state has already been persisted', async () => {
    const f = fixture(); f.complete.mockResolvedValue('stale')
    expect(await f.run()).toBe('stale')
    expect(f.fail).not.toHaveBeenCalled()
  })
  it('rejects invalid envelope and nested transaction signatures', async () => {
    const f = fixture(); f.event.signedPayload = 'bad.jwt.signature'
    expect(await f.run()).toBe('quarantined')
    const nested = fixture()
    nested.event.signedPayload = chain.sign({ notificationUUID: id, notificationType: 'DID_RENEW', version: '2.0', signedDate: Date.now(),
      data: { bundleId: 'ch.moovx.app', environment: 'Sandbox', signedTransactionInfo: 'bad.jwt.signature' } })
    expect(await nested.run()).toBe('quarantined')
    expect(nested.complete).not.toHaveBeenCalled()
  })
  it('quarantines consumption requests instead of sending user data automatically', async () => {
    const f = fixture('CONSUMPTION_REQUEST')
    expect(await f.run()).toBe('quarantined')
    expect(f.api.getTransactionInfo).not.toHaveBeenCalled()
  })
  it('propagates queue write failures so lease recovery remains observable', async () => {
    const f = fixture(); f.binding.mockRejectedValue(new Error('outage')); f.fail.mockRejectedValue(new Error('APPLE_QUEUE_UNAVAILABLE'))
    await expect(f.run()).rejects.toThrow('APPLE_QUEUE_UNAVAILABLE')
  })
})
