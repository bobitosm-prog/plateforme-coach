export const APPLE_PRODUCTS = ['ch.moovx.app.athena.monthly', 'ch.moovx.app.athena.yearly'] as const
export interface NativeProduct { id: string; displayPrice: string }
type TransactionReply = { id: string; signedTransaction: string }
type BridgeReply = { status: string; signedAppTransaction?: string; products?: NativeProduct[]; transactions?: TransactionReply[] }
type Bridge = { postMessage(message: Record<string, string>): Promise<BridgeReply> }
export function applePurchaseBridge(): Bridge | undefined {
  return typeof window === 'undefined' ? undefined : (window as any).webkit?.messageHandlers?.moovxApplePurchases
}
export function isNativeMoovx(): boolean {
  return !!applePurchaseBridge() || (typeof window !== 'undefined' && !!(window as any).webkit?.messageHandlers?.moovxAppleAuth)
}
export async function loadNativeAppleProducts(): Promise<NativeProduct[]> {
  const result = await applePurchaseBridge()?.postMessage({ action: 'products' })
  if (!result?.products || !APPLE_PRODUCTS.every(id => result.products!.some(p => p.id === id && typeof p.displayPrice === 'string' && p.displayPrice.length > 0))) throw Error('APPLE_CATALOG_UNAVAILABLE')
  return APPLE_PRODUCTS.map(id => result.products!.find(p => p.id === id)!)
}
export async function nativeApplePurchase(userId: string, action: 'purchase' | 'restore' | 'pending', productId?: string) {
  const bridge = applePurchaseBridge()
  if (!bridge) throw Error('APPLE_BRIDGE_UNAVAILABLE')
  // Build 23+ supplies Apple's signed app receipt; older builds retain their QA binding.
  let signedAppTransaction: string | undefined
  if ((window as any).__moovxSignedAppleEnvironment === true) {
    const proof = await bridge.postMessage({ action: 'environment' })
    if (typeof proof?.signedAppTransaction !== 'string' || proof.signedAppTransaction.length > 32768) throw Error('APPLE_UNAVAILABLE')
    signedAppTransaction = proof.signedAppTransaction
  }
  const configResponse = await fetch('/api/apple/purchases', signedAppTransaction
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'prepare', userId, signedAppTransaction }), cache: 'no-store' }
    : { cache: 'no-store' })
  if (!configResponse.ok) throw Error('APPLE_UNAVAILABLE')
  const config = await configResponse.json()
  if (config.userId !== userId || typeof config.appAccountToken !== 'string') throw Error('APPLE_ACCOUNT_CHANGED')
  if (action === 'purchase' && !APPLE_PRODUCTS.includes(productId as any)) throw Error('APPLE_PRODUCT_INVALID')
  const result = await bridge.postMessage({ action, appAccountToken: config.appAccountToken, ...(productId ? { productId } : {}) })
  if (!result || !['cancelled', 'pending', 'success'].includes(result.status)) throw Error('APPLE_PURCHASE_UNAVAILABLE')
  if (result.status !== 'success') return { status: result.status, count: 0, sandbox: config.environment === 'Sandbox' }
  if (!Array.isArray(result.transactions) || result.transactions.length > 20) throw Error('APPLE_INVALID_REPLY')
  let count = 0
  for (const transaction of result.transactions) {
    if (!/^\d{1,40}$/.test(transaction.id) || typeof transaction.signedTransaction !== 'string' || transaction.signedTransaction.length > 32768) throw Error('APPLE_INVALID_REPLY')
    const response = await fetch('/api/apple/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, signedTransaction: transaction.signedTransaction, ...(signedAppTransaction ? { signedAppTransaction } : {}) }) })
    if (!response.ok) throw Error('APPLE_SYNC_UNAVAILABLE')
    const acknowledgement = await response.json()
    if (acknowledgement.status !== 'recorded' || acknowledgement.transactionId !== transaction.id) throw Error('APPLE_INVALID_ACKNOWLEDGEMENT')
    // A server outage leaves StoreKit's transaction unfinished for a safe retry.
    await bridge.postMessage({ action: 'finish', appAccountToken: config.appAccountToken, transactionId: transaction.id })
    count++
  }
  if (count) window.dispatchEvent(new Event('moovx:apple-purchase-updated'))
  return { status: 'success', count, sandbox: config.environment === 'Sandbox' }
}

/** Failures before StoreKit opens must not ask users to restore a nonexistent purchase. */
export function applePurchaseErrorKey(error: unknown): 'unavailable' | 'retry' {
  return error instanceof Error && ['APPLE_UNAVAILABLE', 'APPLE_BRIDGE_UNAVAILABLE', 'APPLE_ACCOUNT_CHANGED', 'APPLE_PRODUCT_INVALID'].includes(error.message)
    ? 'unavailable' : 'retry'
}
