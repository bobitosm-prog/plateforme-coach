export const APPLE_PRODUCTS = ['ch.moovx.app.athena.monthly', 'ch.moovx.app.athena.yearly'] as const
export interface NativeProduct { id: string; displayPrice: string }
type TransactionReply = { id: string; signedTransaction: string }
type BridgeReply = { status: string; signedAppTransaction?: string; products?: NativeProduct[]; transactions?: TransactionReply[]; transaction?: TransactionReply }
type Bridge = { postMessage(message: Record<string, string>): Promise<BridgeReply> }
type NativeWindow = Window & { webkit?: { messageHandlers?: { moovxApplePurchases?: Bridge; moovxAppleAuth?: unknown } }; __moovxSignedAppleEnvironment?: boolean }
export function applePurchaseBridge(): Bridge | undefined {
  return typeof window === 'undefined' ? undefined : (window as NativeWindow).webkit?.messageHandlers?.moovxApplePurchases
}
export function isNativeMoovx(): boolean {
  return !!applePurchaseBridge() || (typeof window !== 'undefined' && !!(window as NativeWindow).webkit?.messageHandlers?.moovxAppleAuth)
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
  if ((window as NativeWindow).__moovxSignedAppleEnvironment === true) {
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
  if (action === 'purchase' && !APPLE_PRODUCTS.some(id => id === productId)) throw Error('APPLE_PRODUCT_INVALID')
  let result = await bridge.postMessage({ action, appAccountToken: config.appAccountToken, ...(productId ? { productId } : {}) })
  if (action === 'purchase' && result?.status === 'archivedCandidate') {
    const old = result.transaction
    if (!signedAppTransaction || !old || !/^\d{1,40}$/.test(old.id) ||
        typeof old.signedTransaction !== 'string' || old.signedTransaction.length > 32768) throw Error('apple_purchase_account_mismatch')
    const response = await fetch('/api/apple/purchases', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ action: 'acknowledgeArchived', userId, signedAppTransaction, signedTransaction: old.signedTransaction }),
    })
    if (!response.ok) throw Error('apple_purchase_account_mismatch')
    const acknowledgement = await response.json()
    if (acknowledgement.status !== 'archived' || acknowledgement.transactionId !== old.id) throw Error('APPLE_INVALID_ACKNOWLEDGEMENT')
    const finished = await bridge.postMessage({ action: 'finishArchived', appAccountToken: config.appAccountToken, transactionId: old.id })
    if (finished?.status !== 'success') throw Error('APPLE_PURCHASE_UNAVAILABLE')
    // Only one retry: another mismatched purchase still belongs to its original owner.
    result = await bridge.postMessage({ action, appAccountToken: config.appAccountToken, productId: productId! })
    if (result?.status === 'archivedCandidate') throw Error('apple_purchase_account_mismatch')
  }
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
export function applePurchaseErrorKey(error: unknown): 'unavailable' | 'retry' | 'accountMismatch' | 'catalogUnavailable' | 'presentationUnavailable' | 'appleRejected' {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('apple_purchase_account_mismatch')) return 'accountMismatch'
  if (message.includes('apple_purchase_catalog_unavailable')) return 'catalogUnavailable'
  if (message.includes('apple_purchase_presentation_unavailable')) return 'presentationUnavailable'
  if (message.includes('apple_purchase_navigation_changed')) return 'presentationUnavailable'
  if (message.includes('apple_purchase_storekit_')) return 'appleRejected'
  return ['APPLE_UNAVAILABLE', 'APPLE_BRIDGE_UNAVAILABLE', 'APPLE_ACCOUNT_CHANGED', 'APPLE_PRODUCT_INVALID', 'apple_purchase_unavailable', 'apple_purchase_invalid'].some(code => message.includes(code))
    ? 'unavailable' : 'retry'
}

/** Only a numeric StoreKit status is shown; signed receipts and account tokens stay private. */
export function applePurchaseDiagnosticCode(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error)
  const match = message.match(/apple_purchase_storekit_(-?\d{1,5})(?!\d)/)
  if (match) return `IAP-${match[1]}`
  const mismatch = message.match(/apple_purchase_account_mismatch_(environment|product|no_expiry|not_expired)\b/)
  return mismatch ? `IAP-${({ environment: 'E', product: 'P', no_expiry: 'X', not_expired: 'A' } as const)[mismatch[1] as 'environment' | 'product' | 'no_expiry' | 'not_expired']}` : null
}
