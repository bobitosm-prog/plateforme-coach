import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { rpc } }))
afterEach(() => { vi.unstubAllEnvs(); rpc.mockReset() })
import { selectAppleEntitlement, APPLE_ENTITLEMENT_FRESHNESS_MS, getActiveAppleEntitlement } from '@/lib/entitlements/apple-entitlement-repository'
import { isActiveAppleEntitlement } from '@/lib/entitlements/apple-entitlement'
import { resolveEffectiveEntitlement } from '@/lib/entitlements/effective-entitlement'
import { loadEffectiveEntitlementContext } from '@/lib/entitlements/server-context'
import { fetchEffectiveEntitlementSnapshot } from '@/lib/entitlements/client-snapshot'
const now = Date.now()
const row = { state: 'active', checked_ms: now, access_until_ms: now + 3600000,
  product_id: 'ch.moovx.app.athena.monthly', revoked_ms: null, is_upgraded: false }
describe('Apple access authority', () => {
  it('uses the sandbox reader only for an explicit server-owned QA allowlist', async () => {
    const tester = '00000000-0000-4000-8000-000000000001'
    const regular = '00000000-0000-4000-8000-000000000002'
    vi.stubEnv('APPLE_IAP_SANDBOX_USER_IDS', tester)
    rpc.mockResolvedValue({ data: [], error: null })
    await getActiveAppleEntitlement(regular)
    expect(rpc).toHaveBeenLastCalledWith('read_apple_entitlement_states', { p_user_id: regular })
    await getActiveAppleEntitlement(tester)
    expect(rpc).toHaveBeenLastCalledWith('read_apple_sandbox_entitlement_states', { p_user_id: tester })
  })
  it.each(['active', 'grace'])('grants a current %s subscription', state => {
    expect(selectAppleEntitlement([{ ...row, state }], now)).toEqual({ type: 'paid', plan: 'monthly', accessUntil: row.access_until_ms, validUntil: row.access_until_ms })
  })
  it.each(['expired', 'billing_retry', 'revoked', 'replaced'])('denies %s', state => {
    expect(selectAppleEntitlement([{ ...row, state }], now)).toBeNull()
  })
  it.each([{ revoked_ms: now }, { is_upgraded: true }, { access_until_ms: now },
    { checked_ms: now - APPLE_ENTITLEMENT_FRESHNESS_MS }])('denies invalid or stale evidence %j', patch => {
    expect(selectAppleEntitlement([{ ...row, ...patch }], now)).toBeNull()
  })
  it('caps lifetime proof freshness and keeps independent valid purchases', () => {
    const grant = selectAppleEntitlement([{ ...row, state: 'revoked' }, { ...row, state: 'lifetime', product_id: 'ch.moovx.app.athena.lifetime', access_until_ms: null }], now)
    expect(grant?.type).toBe('lifetime')
    expect(isActiveAppleEntitlement(grant, now)).toBe(true)
    expect(isActiveAppleEntitlement(grant, now + APPLE_ENTITLEMENT_FRESHNESS_MS)).toBe(false)
  })
  it('rejects malformed RPC output', () => {
    expect(() => selectAppleEntitlement([{ ...row, product_id: 'unknown' }], now)).toThrow()
    expect(() => selectAppleEntitlement(null, now)).toThrow()
  })
  it('resolves Apple while retaining Stripe precedence and expired fallback', () => {
    const appleEntitlement = selectAppleEntitlement([row], now)
    expect(resolveEffectiveEntitlement({ subscriptionType: 'trial', appleEntitlement, now: new Date(now) })).toEqual({ type: 'paid', source: 'apple' })
    expect(resolveEffectiveEntitlement({ subscriptionType: 'client_monthly', appleEntitlement })).toEqual({ type: 'paid', source: 'subscription' })
    expect(resolveEffectiveEntitlement({ subscriptionType: 'trial', appleEntitlement, now: new Date(row.access_until_ms) }).type).toBe('trial')
  })
  it('loads only the authenticated identity and preserves Stripe during Apple outage', async () => {
    const loader = vi.fn().mockResolvedValue(selectAppleEntitlement([row], now))
    const context = await loadEffectiveEntitlementContext('user-a', 'trial', async () => null, loader)
    expect(loader).toHaveBeenCalledWith('user-a')
    expect(context.effectiveEntitlement.source).toBe('apple')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fallback = await loadEffectiveEntitlementContext('user-a', 'client_monthly', async () => null, async () => { throw Error('offline') })
    expect(fallback.effectiveEntitlement.source).toBe('subscription')
    expect(fallback.appleEntitlement).toBeNull()
    log.mockRestore()
  })
  it('accepts a structurally valid expired snapshot but never grants access from it', async () => {
    const grant = selectAppleEntitlement([row], now)!
    const expired = { ...grant, validUntil: 1 }
    const snapshot = await fetchEffectiveEntitlementSnapshot(vi.fn().mockResolvedValue({ ok: true, json: async () => ({ appleEntitlement: expired, capabilities: { ai: true, nutrition: true, training: true, coachManaged: false }, effectiveEntitlement: { type: 'paid', source: 'apple' } }) }))
    expect(isActiveAppleEntitlement(snapshot.appleEntitlement)).toBe(false)
  })
})
