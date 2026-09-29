import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ user: vi.fn(), binding: vi.fn(), sync: vi.fn(), rate: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseRouteClient: async () => ({ auth: { getUser: mocks.user } }) }))
vi.mock('@/lib/apple/purchase-ledger', () => ({ prepareAppleAccountBinding: mocks.binding }))
vi.mock('@/lib/apple/purchase-service', () => ({ purchaseEnvironment: () => 'Production', syncApplePurchase: mocks.sync }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate }))
import { GET, POST } from '@/app/api/apple/purchases/route'
const id = '00000000-0000-4000-8000-000000000001'
const url = 'https://app.moovx.ch/api/apple/purchases'
const post = (body: unknown, origin = 'https://app.moovx.ch') => new Request(url, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('APPLE_IAP_PURCHASES_ENABLED', 'true'); vi.stubEnv('APPLE_IAP_ENTITLEMENTS_ENABLED', 'true'); vi.stubEnv('APPLE_IAP_PRODUCTION_PURCHASES_ENABLED', 'true')
  mocks.rate.mockReturnValue({ allowed: true })
  mocks.user.mockResolvedValue({ data: { user: { id } }, error: null })
  mocks.binding.mockResolvedValue('00000000-0000-4000-8000-000000000010')
  mocks.sync.mockResolvedValue({ status: 'recorded', transactionId: '1', environment: 'Production' })
})
afterEach(() => vi.unstubAllEnvs())
describe('authenticated Apple purchase transport', () => {
  it('requires explicit activation and does not touch credentials while off', async () => {
    vi.stubEnv('APPLE_IAP_PURCHASES_ENABLED', '')
    expect((await GET(new Request(url))).status).toBe(503)
    expect(mocks.user).not.toHaveBeenCalled()
  })
  it('does not prepare a production purchase while access activation is off', async () => {
    vi.stubEnv('APPLE_IAP_ENTITLEMENTS_ENABLED', '')
    expect((await GET(new Request(url))).status).toBe(503)
    expect(mocks.binding).not.toHaveBeenCalled()
  })
  it('derives the binding from authenticated identity', async () => {
    expect((await GET(new Request(url))).status).toBe(200)
    expect(mocks.binding).toHaveBeenCalledWith(id, 'Production')
  })
  it('rejects a cross-origin POST before verification', async () => {
    expect((await POST(post({ userId: id, signedTransaction: 'test' }, 'https://evil.example'))).status).toBe(403)
    expect(mocks.sync).not.toHaveBeenCalled()
  })
  it('rejects anonymous and rate-limited requests', async () => {
    mocks.user.mockResolvedValue({ data: { user: null }, error: null })
    expect((await GET(new Request(url))).status).toBe(401)
    mocks.rate.mockReturnValue({ allowed: false })
    expect((await GET(new Request(url))).status).toBe(429)
  })
  it('rejects late replies from a different MoovX account', async () => {
    expect((await POST(post({ userId: 'other', signedTransaction: 'test' }))).status).toBe(409)
    expect(mocks.sync).not.toHaveBeenCalled()
  })
  it('bounds request bodies and does not leak server errors', async () => {
    expect((await POST(post({ userId: id, signedTransaction: 'x'.repeat(35000) }))).status).toBe(413)
    mocks.sync.mockRejectedValue(new Error('private upstream information'))
    const result = await POST(post({ userId: id, signedTransaction: 'test' }))
    expect(result.status).toBe(503)
    expect(await result.text()).not.toContain('private')
  })
  it('acknowledges only successful server persistence', async () => {
    const response = await POST(post({ userId: id, signedTransaction: 'test' }))
    expect(response.status).toBe(200)
    expect(mocks.sync).toHaveBeenCalledWith(id, 'test')
  })
})
