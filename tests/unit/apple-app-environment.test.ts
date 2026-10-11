import { describe, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { Environment, SignedDataVerifier } from '@apple/app-store-server-library'
import { verifiedPurchaseEnvironment } from '@/lib/apple/environment'
import { createAppleTestChain } from './helpers/apple-test-chain'
const chain = createAppleTestChain()
const verifier = (environment: Environment.SANDBOX | Environment.PRODUCTION) =>
  new SignedDataVerifier([chain.root], false, environment, 'ch.moovx.app', 6815356426)
const payload = { receiptType: 'Sandbox', bundleId: 'ch.moovx.app', appAppleId: 6815356426,
  receiptCreationDate: Date.now(), originalPurchaseDate: Date.now(), applicationVersion: '23' }
describe('Apple signed app environment', () => {
  it.each(['Sandbox', 'Production'])('recognizes %s from verified evidence, independent of MoovX account', async receiptType => {
    expect(await verifiedPurchaseEnvironment(chain.sign({ ...payload, receiptType }), verifier)).toBe(receiptType)
  })
  it('accepts Sandbox app receipts without a production app identifier', async () => {
    expect(await verifiedPurchaseEnvironment(chain.sign({ ...payload, appAppleId: undefined }), verifier)).toBe('Sandbox')
  })
  it.each([{ bundleId: 'wrong.app' }, { receiptType: 'Xcode' }, { receiptType: 'LocalTesting' },
    { receiptType: 'Production', appAppleId: 1 }])('rejects invalid identity/environment %j', async patch => {
    await expect(verifiedPurchaseEnvironment(chain.sign({ ...payload, ...patch }), verifier)).rejects.toThrow()
  })
  it('rejects a modified payload and oversized input', async () => {
    const parts = chain.sign(payload).split('.')
    parts[1] = Buffer.from(JSON.stringify({ ...payload, receiptType: 'Production' })).toString('base64url')
    await expect(verifiedPurchaseEnvironment(parts.join('.'), verifier)).rejects.toThrow()
    await expect(verifiedPurchaseEnvironment('x'.repeat(32769), verifier)).rejects.toThrow()
  })
})
