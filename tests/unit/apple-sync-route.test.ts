import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ run: vi.fn(), rate: vi.fn() }))
vi.mock('@/lib/apple/sync-worker', () => ({ runAppleSync: mocks.run }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate }))
import { POST } from '@/app/api/apple/sync/route'
const request = (authorization?: string) => new Request('https://app.moovx.ch/api/apple/sync', { method: 'POST', headers: authorization ? { authorization } : {} })
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('APPLE_IAP_SYNC_ENABLED', 'true'); vi.stubEnv('APPLE_IAP_CRON_SECRET', 'test-only-secret')
  vi.stubEnv('APPLE_IAP_SANDBOX_USER_IDS', '')
  mocks.rate.mockReturnValue({ allowed: true }); mocks.run.mockResolvedValue({ notification: 'idle', reconciliation: 'idle' })
})
afterEach(() => vi.unstubAllEnvs())
describe('Apple scheduler boundary', () => {
  it('rejects missing, wrong and malformed credentials without DB work', async () => {
    for (const header of [undefined, 'Bearer wrong', 'Bearer test-only-secrex']) expect((await POST(request(header))).status).toBe(401)
    expect(mocks.run).not.toHaveBeenCalled()
  })
  it('requires activation and applies rate limits', async () => {
    vi.stubEnv('APPLE_IAP_SYNC_ENABLED', '')
    expect((await POST(request('Bearer test-only-secret'))).status).toBe(503)
    vi.stubEnv('APPLE_IAP_SYNC_ENABLED', 'true'); mocks.rate.mockReturnValue({ allowed: false })
    expect((await POST(request('Bearer test-only-secret'))).status).toBe(429)
    expect(mocks.run).not.toHaveBeenCalled()
  })
  it('runs production only by default, sandbox only with an explicit QA configuration', async () => {
    expect((await POST(request('Bearer test-only-secret'))).status).toBe(200)
    expect(mocks.run).toHaveBeenCalledExactlyOnceWith('Production')
    vi.stubEnv('APPLE_IAP_SANDBOX_USER_IDS', 'qa-user')
    await POST(request('Bearer test-only-secret'))
    expect(mocks.run).toHaveBeenLastCalledWith('Sandbox')
  })
})
