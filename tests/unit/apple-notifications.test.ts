import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Environment, SignedDataVerifier, VerificationException, VerificationStatus } from '@apple/app-store-server-library'
import { createAppleTestChain } from './helpers/apple-test-chain'
import { verifyAppleNotification, AppleNotificationVerificationError, MAX_APPLE_NOTIFICATION_BYTES } from '@/lib/apple/notification-verification'
import { handleAppleNotification } from '@/lib/apple/notification-handler'
import { POST } from '@/app/api/apple/notifications/[environment]/route'
vi.mock('server-only', () => ({}))
let chain: ReturnType<typeof createAppleTestChain>
let verifier: SignedDataVerifier
const id = '00000000-0000-4000-8000-000000000010'
const payload = () => ({ notificationUUID: id, notificationType: 'TEST', version: '2.0', signedDate: Date.now(),
  data: { environment: 'Sandbox', bundleId: 'ch.moovx.app', appAppleId: 6815356426 } })
beforeAll(() => {
  chain = createAppleTestChain()
  verifier = new SignedDataVerifier([chain.root], false, Environment.SANDBOX, 'ch.moovx.app', 6815356426)
})
const verify = (patch: object = {}) => verifyAppleNotification(chain.sign({ ...payload(), ...patch }), Environment.SANDBOX, verifier)
const request = (body: unknown, contentType = 'application/json') => new Request('https://example.test/api/apple/notifications/sandbox', {
  method: 'POST', headers: { 'content-type': contentType }, body: JSON.stringify(body),
})
function dependencies() {
  return { enabled: () => true, allow: () => true,
    verify: (jws: string, environment: Environment.SANDBOX | Environment.PRODUCTION) => verifyAppleNotification(jws, environment, verifier),
    enqueue: vi.fn().mockResolvedValue('inserted') }
}
describe('Apple notification envelopes with real signatures', () => {
  it('verifies TEST without requiring a transaction or a browser session', async () => {
    expect(await verify()).toMatchObject({ notificationId: id, notificationType: 'TEST', environment: 'Sandbox' })
  })
  it('keeps other event types pending for a worker, without interpreting nested data', async () => {
    expect(await verify({ notificationType: 'DID_RENEW' })).toMatchObject({ notificationType: 'DID_RENEW' })
  })
  it('rejects payload tampering', async () => {
    const parts = chain.sign(payload()).split('.')
    parts[1] = Buffer.from(JSON.stringify({ ...payload(), notificationType: 'REFUND' })).toString('base64url')
    await expect(verifyAppleNotification(parts.join('.'), Environment.SANDBOX, verifier)).rejects.toThrow('APPLE_NOTIFICATION_INVALID')
  })
  it('rejects a forged trust anchor using the deployment verifier', async () => {
    await expect(verifyAppleNotification(chain.sign(payload()), Environment.SANDBOX)).rejects.toThrow('APPLE_NOTIFICATION_INVALID')
  })
  it.each([
    { notificationUUID: undefined }, { notificationUUID: 'bad' }, { version: '1.0' },
    { notificationType: undefined }, { signedDate: 0 }, { signedDate: Number.MAX_SAFE_INTEGER },
    { data: { environment: 'Production', bundleId: 'ch.moovx.app' } },
    { data: { environment: 'Sandbox', bundleId: 'wrong.app' } },
    { summary: { environment: 'Sandbox', bundleId: 'ch.moovx.app' } },
  ])('rejects invalid envelope %j', async patch => {
    await expect(verify(patch)).rejects.toThrow('APPLE_NOTIFICATION_INVALID')
  })
  it('requires the correct numeric app ID in production', async () => {
    const production = new SignedDataVerifier([chain.root], false, Environment.PRODUCTION, 'ch.moovx.app', 6815356426)
    await expect(verifyAppleNotification(chain.sign({ ...payload(), data: { environment: 'Production', bundleId: 'ch.moovx.app', appAppleId: 1 } }),
      Environment.PRODUCTION, production)).rejects.toThrow('APPLE_NOTIFICATION_INVALID')
  })
  it('rejects oversized JWS before certificate verification', async () => {
    await expect(verifyAppleNotification('a'.repeat(MAX_APPLE_NOTIFICATION_BYTES + 1), Environment.SANDBOX, verifier)).rejects.toThrow('APPLE_NOTIFICATION_INVALID')
  })
  it('identifies OCSP outages as retryable', async () => {
    await expect(verifyAppleNotification('a.b.c', Environment.SANDBOX, { verifyAndDecodeNotification: async () => {
      throw new VerificationException(VerificationStatus.RETRYABLE_VERIFICATION_FAILURE)
    } })).rejects.toMatchObject({ retryable: true })
  })
})
describe('notification HTTP ingestion', () => {
  it('acknowledges only after durable enqueue resolves', async () => {
    const deps = dependencies()
    let finish!: (value: string) => void
    deps.enqueue.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const operation = handleAppleNotification(request({ signedPayload: chain.sign(payload()) }), 'sandbox', deps)
    await vi.waitFor(() => expect(deps.enqueue).toHaveBeenCalledOnce())
    let completed = false
    void operation.then(() => { completed = true })
    await Promise.resolve()
    expect(completed).toBe(false)
    finish('inserted')
    expect((await operation).status).toBe(200)
  })
  it.each(['inserted', 'duplicate'])('acknowledges durable %s receipt', async outcome => {
    const deps = dependencies(); deps.enqueue.mockResolvedValue(outcome)
    expect((await handleAppleNotification(request({ signedPayload: chain.sign(payload()) }), 'sandbox', deps)).status).toBe(200)
  })
  it('returns 503 when storage fails, without echoing sensitive details', async () => {
    const deps = dependencies(); deps.enqueue.mockRejectedValue(new Error('private database detail'))
    const response = await handleAppleNotification(request({ signedPayload: chain.sign(payload()) }), 'sandbox', deps)
    expect(response.status).toBe(503); expect(await response.text()).toBe('')
  })
  it('returns 400 for invalid signature without writing', async () => {
    const deps = dependencies()
    expect((await handleAppleNotification(request({ signedPayload: 'fake.jwt.signature' }), 'sandbox', deps)).status).toBe(400)
    expect(deps.enqueue).not.toHaveBeenCalled()
  })
  it('returns 503 for a verifier outage', async () => {
    const deps = dependencies(); deps.verify = async () => { throw new AppleNotificationVerificationError(true) }
    expect((await handleAppleNotification(request({ signedPayload: 'a.b.c' }), 'sandbox', deps)).status).toBe(503)
    expect(deps.enqueue).not.toHaveBeenCalled()
  })
  it('fails closed when disabled, including the actual route entry point', async () => {
    const deps = dependencies(); deps.enabled = () => false
    expect((await handleAppleNotification(request({}), 'sandbox', deps)).status).toBe(503)
    vi.stubEnv('APPLE_IAP_SANDBOX_NOTIFICATIONS_ENABLED', '')
    try { expect((await POST(request({}), { params: Promise.resolve({ environment: 'sandbox' }) })).status).toBe(503) }
    finally { vi.unstubAllEnvs() }
    expect(deps.enqueue).not.toHaveBeenCalled()
  })
  it('rejects unknown environments and applies the rate limit', async () => {
    const deps = dependencies()
    expect((await handleAppleNotification(request({}), 'local', deps)).status).toBe(404)
    deps.allow = () => false
    expect((await handleAppleNotification(request({}), 'sandbox', deps)).status).toBe(429)
    expect(deps.enqueue).not.toHaveBeenCalled()
  })
  it.each([null, {}, { signedPayload: 42 }])('rejects malformed payload %j', async body => {
    expect((await handleAppleNotification(request(body), 'sandbox', dependencies())).status).toBe(400)
  })
  it('requires JSON and bounds the streamed body even without content-length', async () => {
    expect((await handleAppleNotification(request({}, 'text/plain'), 'sandbox', dependencies())).status).toBe(415)
    expect((await handleAppleNotification(request({ signedPayload: 'x'.repeat(140000) }), 'sandbox', dependencies())).status).toBe(413)
  })
})
