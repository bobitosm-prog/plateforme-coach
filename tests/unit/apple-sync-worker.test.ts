import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { Environment } from '@apple/app-store-server-library'
import { runAppleSync, type SyncDependencies } from '@/lib/apple/sync-worker'
import { purchaseEnvironment } from '@/lib/apple/purchase-service'
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {} }))
afterEach(() => vi.unstubAllEnvs())
const environment = Environment.PRODUCTION
const job = { userId: 'user', leaseToken: 'lease', transaction: { environment, appAccountToken: 'bound-token' } }
function dependencies() {
  return { notification: vi.fn().mockResolvedValue('idle'), claim: vi.fn().mockResolvedValue(job),
    reconcile: vi.fn().mockResolvedValue({ state: 'lifetime' }), finish: vi.fn().mockResolvedValue(undefined) }
}
describe('scheduled Apple refresh', () => {
  it('reconciles an owned purchase even without any notification', async () => {
    const deps = dependencies()
    expect(await runAppleSync(environment, deps as unknown as SyncDependencies)).toEqual({ notification: 'idle', reconciliation: 'processed' })
    expect(deps.reconcile).toHaveBeenCalledWith(job.transaction, { environment, expectedAccountToken: 'bound-token' })
    expect(deps.finish).toHaveBeenCalledWith(job, { state: 'lifetime' })
  })
  it('schedules retry without replacing last confirmed state on outage', async () => {
    const deps = dependencies(); deps.reconcile.mockRejectedValue(new Error('offline'))
    expect((await runAppleSync(environment, deps as unknown as SyncDependencies)).reconciliation).toBe('retry')
    expect(deps.finish).toHaveBeenCalledWith(job, null)
  })
  it('does no work when no purchase is due', async () => {
    const deps = dependencies(); deps.claim.mockResolvedValue(null)
    expect((await runAppleSync(environment, deps as unknown as SyncDependencies)).reconciliation).toBe('idle')
    expect(deps.reconcile).not.toHaveBeenCalled()
  })
  it('selects Sandbox only for identities explicitly configured by the server', () => {
    vi.stubEnv('APPLE_IAP_SANDBOX_USER_IDS', 'tester')
    expect(purchaseEnvironment('tester')).toBe(Environment.SANDBOX)
    expect(purchaseEnvironment('other')).toBe(Environment.PRODUCTION)
  })
})
