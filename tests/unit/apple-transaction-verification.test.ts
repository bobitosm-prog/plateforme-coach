import { beforeAll, describe, expect, it, vi } from 'vitest'
import { X509Certificate } from 'node:crypto'
import {
  Environment, SignedDataVerifier, Type, VerificationException, VerificationStatus,
} from '@apple/app-store-server-library'
import { createAppleTestChain } from './helpers/apple-test-chain'
import { verifyAppleTransaction, type AppleEnvironment } from '@/lib/apple/transaction-verification'
import roots from '@/lib/apple/root-certificates.json'

vi.mock('server-only', () => ({}))

const token = '00000000-0000-4000-8000-000000000001'
const context = { environment: Environment.SANDBOX as AppleEnvironment, expectedAccountToken: token }
let chain: ReturnType<typeof createAppleTestChain>
let verifier: SignedDataVerifier
let now: number
const payload = () => ({
  environment: Environment.SANDBOX, bundleId: 'ch.moovx.app',
  productId: 'ch.moovx.app.athena.monthly', type: Type.AUTO_RENEWABLE_SUBSCRIPTION,
  subscriptionGroupIdentifier: '22425039', quantity: 1, inAppOwnershipType: 'PURCHASED',
  transactionId: '200000000000001', originalTransactionId: '200000000000001',
  appAccountToken: token, purchaseDate: now - 1000, signedDate: now, expiresDate: now + 30 * 86400000,
})
const verify = (patch: object = {}) => verifyAppleTransaction(chain.sign({ ...payload(), ...patch }), context, verifier)

beforeAll(() => {
  chain = createAppleTestChain()
  now = Date.now()
  // Offline ONLY for the ephemeral test PKI, whose root is never a deployment trust anchor.
  verifier = new SignedDataVerifier([chain.root], false, Environment.SANDBOX, 'ch.moovx.app', 6815356426)
})

describe('Apple transaction cryptographic runtime verification', () => {
  it.each(['monthly', 'yearly', 'lifetime'])('verifies signed %s evidence with real ES256 and certificate checks', async plan => {
    const productId = `ch.moovx.app.athena.${plan}`
    const result = await verify({ productId, ...(plan === 'lifetime' ? { type: Type.NON_CONSUMABLE, expiresDate: undefined } : {}) })
    expect(result.productId).toBe(productId)
    expect(result.appAccountToken).toBe(token)
    expect(result).not.toHaveProperty('active')
  })

  it('rejects payload tampering without re-signing', async () => {
    const parts = chain.sign(payload()).split('.')
    parts[1] = Buffer.from(JSON.stringify({ ...payload(), productId: 'ch.moovx.app.athena.lifetime' })).toString('base64url')
    await expect(verifyAppleTransaction(parts.join('.'), context, verifier)).rejects.toMatchObject({ code: 'APPLE_INVALID_TRANSACTION' })
  })

  it('rejects a forged root chain with the actual deployment trust store', async () => {
    await expect(verifyAppleTransaction(chain.sign(payload()), context)).rejects.toMatchObject({ code: 'APPLE_INVALID_TRANSACTION' })
  })

  it.each([
    { bundleId: 'another.app' }, { environment: Environment.PRODUCTION },
    { productId: 'unknown' }, { productId: 'toString' }, { type: Type.CONSUMABLE },
    { subscriptionGroupIdentifier: 'another-group' }, { inAppOwnershipType: 'FAMILY_SHARED' },
    { transactionId: undefined }, { originalTransactionId: 'not-an-id' }, { quantity: 2 },
    { expiresDate: undefined }, { expiresDate: 0 }, { purchaseDate: -1 },
    { signedDate: undefined }, { signedDate: Number.MAX_SAFE_INTEGER },
    { revocationDate: -1 }, { revocationReason: 0 },
    { type: Type.NON_CONSUMABLE, productId: 'ch.moovx.app.athena.lifetime' },
  ])('rejects invalid signed business data: %j', async patch => {
    await expect(verify(patch)).rejects.toMatchObject({ code: 'APPLE_INVALID_TRANSACTION' })
  })

  it.each([undefined, '00000000-0000-4000-8000-000000000002', 'bad-token'])('rejects an unbound/different account %s', async appAccountToken => {
    await expect(verify({ appAccountToken })).rejects.toMatchObject({ code: 'APPLE_ACCOUNT_MISMATCH' })
  })

  it('normalizes UUID case', async () => {
    const upper = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'
    const result = await verifyAppleTransaction(chain.sign({ ...payload(), appAccountToken: upper }),
      { ...context, expectedAccountToken: upper.toLowerCase() }, verifier)
    expect(result.appAccountToken).toBe(upper.toLowerCase())
  })

  it.each([Environment.XCODE, Environment.LOCAL_TESTING])('forbids signature-bypass environment %s', async environment => {
    await expect(verifyAppleTransaction(chain.sign(payload()), { ...context, environment: environment as AppleEnvironment }, verifier))
      .rejects.toMatchObject({ code: 'APPLE_INVALID_TRANSACTION' })
  })

  it('retains expired, refunded and upgraded evidence without granting access', async () => {
    const result = await verify({ expiresDate: now - 1, revocationDate: now - 100, revocationReason: 0, isUpgraded: true })
    expect(result.expiresDate).toBeLessThan(now)
    expect(result.revocationDate).toBe(now - 100)
    expect(result.isUpgraded).toBe(true)
    expect(result).not.toHaveProperty('entitlement')
  })

  it('returns a safe retryable error for OCSP outages', async () => {
    const offlineVerifier = { verifyAndDecodeTransaction: async () => {
      throw new VerificationException(VerificationStatus.RETRYABLE_VERIFICATION_FAILURE)
    } }
    await expect(verifyAppleTransaction(chain.sign(payload()), context, offlineVerifier))
      .rejects.toMatchObject({ message: 'APPLE_VERIFICATION_UNAVAILABLE', code: 'APPLE_VERIFICATION_UNAVAILABLE' })
  })

  it('rejects oversized inputs before calling the verifier', async () => {
    const decode = vi.fn()
    await expect(verifyAppleTransaction('a'.repeat(32769) + '.b.c', context, { verifyAndDecodeTransaction: decode }))
      .rejects.toMatchObject({ code: 'APPLE_INVALID_TRANSACTION' })
    expect(decode).not.toHaveBeenCalled()
  })

  it('bundles authentic self-signed Apple roots with recorded fingerprints', () => {
    expect(roots).toHaveLength(3)
    for (const root of roots) {
      const certificate = new X509Certificate(Buffer.from(root.der, 'base64'))
      expect(certificate.ca).toBe(true)
      expect(certificate.verify(certificate.publicKey)).toBe(true)
      expect(certificate.fingerprint256).toBe(root.sha256)
      expect(certificate.subject).toContain('Apple')
    }
  })
})
