import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ user: vi.fn(), binding: vi.fn(), proof: vi.fn(), sync: vi.fn(), archived: vi.fn(), rate: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseRouteClient: async () => ({ auth: { getUser: mocks.user } }) }))
vi.mock('@/lib/apple/purchase-ledger', () => ({ prepareAppleAccountBinding: mocks.binding }))
vi.mock('@/lib/apple/purchase-service', () => ({ purchaseEnvironment: () => 'Production', syncApplePurchase: mocks.sync }))
vi.mock('@/lib/apple/archived-transaction', () => ({ acknowledgeArchivedAppleTransaction: mocks.archived }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate }))
vi.mock('@/lib/apple/environment', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/apple/environment')>(), verifiedPurchaseEnvironment: mocks.proof }))
import { GET, POST } from '@/app/api/apple/purchases/route'
const id = '00000000-0000-4000-8000-000000000001'
const url = 'https://app.moovx.ch/api/apple/purchases'
const post = (body: unknown, origin = 'https://app.moovx.ch') => new Request(url, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('APPLE_IAP_PURCHASES_ENABLED', 'true'); vi.stubEnv('APPLE_IAP_ENTITLEMENTS_ENABLED', 'true'); vi.stubEnv('APPLE_IAP_PRODUCTION_PURCHASES_ENABLED', 'true')
  mocks.proof.mockResolvedValue('Sandbox')
  mocks.rate.mockReturnValue({ allowed: true })
  mocks.user.mockResolvedValue({ data: { user: { id } }, error: null })
  mocks.binding.mockResolvedValue('00000000-0000-4000-8000-000000000010')
  mocks.sync.mockResolvedValue({ status: 'recorded', transactionId: '1', environment: 'Production' })
  mocks.archived.mockResolvedValue(null)
})
afterEach(() => vi.unstubAllEnvs())
describe('authenticated Apple purchase transport', () => {
  it('prepares a new TestFlight account without an allowlist using verified app evidence', async () => {
    vi.stubEnv('APPLE_IAP_SANDBOX_USER_IDS', '')
    vi.stubEnv('APPLE_IAP_SANDBOX_ENABLED', 'true')
    vi.stubEnv('APPLE_IAP_PRODUCTION_PURCHASES_ENABLED', 'false')
    const response = await POST(post({ action: 'prepare', userId: id, signedAppTransaction: 'signed.app.proof' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ environment: 'Sandbox', userId: id })
    expect(mocks.proof).toHaveBeenCalledWith('signed.app.proof')
    expect(mocks.binding).toHaveBeenCalledWith(id, 'Sandbox')
    expect(mocks.sync).not.toHaveBeenCalled()
  })
  it('does not accept an unsigned Sandbox flag or bypass production activation', async () => {
    vi.stubEnv('APPLE_IAP_PRODUCTION_PURCHASES_ENABLED', 'false')
    expect((await POST(post({ action: 'prepare', userId: id, environment: 'Sandbox' }))).status).toBe(503)
    expect(mocks.binding).not.toHaveBeenCalled()
  })
  it('rejects forged app evidence before preparing an account or synchronizing a purchase', async () => {
    mocks.proof.mockRejectedValue(new Error('invalid evidence'))
    expect((await POST(post({ action: 'prepare', userId: id, signedAppTransaction: 'forged' }))).status).toBe(503)
    expect(mocks.binding).not.toHaveBeenCalled()
    expect(mocks.sync).not.toHaveBeenCalled()
  })

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
    expect((await POST(post({ userId: id, signedTransaction: 'x'.repeat(69000) }))).status).toBe(413)
    mocks.sync.mockRejectedValue(new Error('private upstream information'))
    const result = await POST(post({ userId: id, signedTransaction: 'test' }))
    expect(result.status).toBe(503)
    expect(await result.text()).not.toContain('private')
  })
  it('acknowledges only successful server persistence', async () => {
    const response = await POST(post({ userId: id, signedTransaction: 'test' }))
    expect(response.status).toBe(200)
    expect(mocks.sync).toHaveBeenCalledWith(id, 'test', 'Production')
  })
  it('allows archived cleanup only after signed environment proof and a server match', async () => {
    vi.stubEnv('APPLE_IAP_SANDBOX_ENABLED', 'true')
    mocks.archived.mockResolvedValueOnce({ status: 'archived', transactionId: '99' })
    const body = { action: 'acknowledgeArchived', userId: id, signedAppTransaction: 'app.proof', signedTransaction: 'transaction.proof' }
    const success = await POST(post(body))
    expect(success.status).toBe(200)
    expect(mocks.archived).toHaveBeenCalledWith(id, 'transaction.proof', 'Sandbox')
    expect((await POST(post(body))).status).toBe(409)
    expect((await POST(post({ ...body, signedAppTransaction: undefined }))).status).toBe(400)
    expect(mocks.sync).not.toHaveBeenCalled()
  })
})
