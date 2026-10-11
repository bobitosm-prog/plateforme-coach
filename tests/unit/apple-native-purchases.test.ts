import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nativeApplePurchase, loadNativeAppleProducts } from '@/lib/apple/native-purchases'
const userId = 'account-a'
const token = '00000000-0000-4000-8000-000000000001'
const bridge = { postMessage: vi.fn() }
const request = vi.fn()
const dispatch = vi.fn()
const config = { userId, appAccountToken: token, environment: 'Production' }
const transaction = { id: '123', signedTransaction: 'signed-test-proof' }
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('window', { webkit: { messageHandlers: { moovxApplePurchases: bridge } }, dispatchEvent: dispatch })
  vi.stubGlobal('fetch', request)
  request.mockResolvedValueOnce({ ok: true, json: async () => config })
  bridge.postMessage.mockResolvedValue({ status: 'success', transactions: [transaction] })
})
afterEach(() => vi.unstubAllGlobals())
describe('native Apple purchase coordination', () => {
  it('finishes only after the server acknowledges the same transaction', async () => {
    request.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'recorded', transactionId: '123' }) })
    expect((await nativeApplePurchase(userId, 'restore')).count).toBe(1)
    expect(bridge.postMessage).toHaveBeenLastCalledWith({ action: 'finish', appAccountToken: token, transactionId: '123' })
    expect(dispatch).toHaveBeenCalledOnce()
  })
  it('leaves an unfinished purchase recoverable after server failure', async () => {
    request.mockResolvedValueOnce({ ok: false })
    await expect(nativeApplePurchase(userId, 'restore')).rejects.toThrow('APPLE_SYNC_UNAVAILABLE')
    expect(bridge.postMessage).toHaveBeenCalledOnce()
    expect(dispatch).not.toHaveBeenCalled()
  })
  it('does not purchase when the authenticated account changes', async () => {
    await expect(nativeApplePurchase('account-b', 'purchase', 'ch.moovx.app.athena.monthly')).rejects.toThrow('APPLE_ACCOUNT_CHANGED')
    expect(bridge.postMessage).not.toHaveBeenCalled()
  })
  it.each(['pending', 'cancelled'])('does not grant or finish a %s purchase', async status => {
    bridge.postMessage.mockResolvedValue({ status })
    expect((await nativeApplePurchase(userId, 'purchase', 'ch.moovx.app.athena.monthly')).status).toBe(status)
    expect(request).toHaveBeenCalledOnce()
    expect(dispatch).not.toHaveBeenCalled()
  })
  it('rejects a mismatched server acknowledgement', async () => {
    request.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'recorded', transactionId: 'other' }) })
    await expect(nativeApplePurchase(userId, 'restore')).rejects.toThrow('APPLE_INVALID_ACKNOWLEDGEMENT')
    expect(bridge.postMessage).toHaveBeenCalledOnce()
  })
})

describe('two-offer Apple catalogue', () => {
  it.each([['monthly', 'yearly'], ['monthly', 'yearly', 'lifetime']])('accepts current and legacy native catalogues: %s', async (...plans) => {
    bridge.postMessage.mockResolvedValue({ products: plans.map(plan => ({ id: `ch.moovx.app.athena.${plan}`, displayPrice: 'CHF 9.90' })) })
    expect((await loadNativeAppleProducts()).map(p => p.id)).toEqual(['ch.moovx.app.athena.monthly', 'ch.moovx.app.athena.yearly'])
  })
  it('rejects an incomplete catalogue', async () => {
    bridge.postMessage.mockResolvedValue({ products: [{ id: 'ch.moovx.app.athena.monthly', displayPrice: 'CHF 9.90' }] })
    await expect(loadNativeAppleProducts()).rejects.toThrow('APPLE_CATALOG_UNAVAILABLE')
  })
  it('blocks new lifetime purchases without calling StoreKit', async () => {
    await expect(nativeApplePurchase(userId, 'purchase', 'ch.moovx.app.athena.lifetime')).rejects.toThrow('APPLE_PRODUCT_INVALID')
    expect(bridge.postMessage).not.toHaveBeenCalled()
  })
})
