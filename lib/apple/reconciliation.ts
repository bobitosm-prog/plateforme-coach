import 'server-only'
import {
  Environment, Status, type AppStoreServerAPIClient, type SignedDataVerifier,
} from '@apple/app-store-server-library'
import { createAppleServerAPIClient } from './server-api'
import { getAppleSignedDataVerifier, verifyAppleTransaction, type AppleEnvironment, type VerifiedAppleTransaction } from './transaction-verification'

export interface AppleReconciliation {
  /** Observation only. Persist ownership/current state before resolving access. */
  state: 'active' | 'grace' | 'lifetime' | 'expired' | 'billing_retry' | 'revoked' | 'replaced'
  accessUntil: number | null
  checkedAt: number
  transaction: VerifiedAppleTransaction
}
type API = Pick<AppStoreServerAPIClient, 'getTransactionInfo' | 'getAllSubscriptionStatuses'>
type Verifier = Pick<SignedDataVerifier, 'verifyAndDecodeTransaction' | 'verifyAndDecodeRenewalInfo'>

function invalid(): never { throw new Error('APPLE_RECONCILIATION_INVALID') }
async function request<T>(operation: () => Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('TIMEOUT')), 15_000)
      }),
    ])
  } catch {
    // No raw Apple responses, identifiers, bearer tokens or private key details.
    throw new Error('APPLE_RECONCILIATION_UNAVAILABLE')
  } finally { if (timeout) clearTimeout(timeout) }
}

/**
 * Server-only observation from live Apple API, never from browser-supplied status.
 * Input is an already verified purchase belonging to the authenticated binding.
 * Dependency overrides are only for trusted runtime tests. No writes or grants here.
 */
export async function reconcileApplePurchase(
  seed: VerifiedAppleTransaction,
  context: { environment: AppleEnvironment; expectedAccountToken: string },
  dependencies?: { api: API; verifier: Verifier },
): Promise<AppleReconciliation> {
  if ((context.environment !== Environment.SANDBOX && context.environment !== Environment.PRODUCTION) ||
      seed.environment !== context.environment || seed.appAccountToken !== context.expectedAccountToken.toLowerCase() ||
      !/^\d{1,40}$/.test(seed.transactionId)) invalid()
  const api = dependencies?.api ?? createAppleServerAPIClient(context.environment)
  const verifier = dependencies?.verifier ?? getAppleSignedDataVerifier(context.environment)
  const info = await request(() => api.getTransactionInfo(seed.transactionId))
  if (!info.signedTransactionInfo) invalid()
  let transaction = await verifyAppleTransaction(info.signedTransactionInfo, context, verifier)
  if (transaction.transactionId !== seed.transactionId || transaction.originalTransactionId !== seed.originalTransactionId ||
      transaction.productId !== seed.productId || transaction.purchaseDate !== seed.purchaseDate ||
      transaction.signedDate < seed.signedDate) invalid()

  const result = (state: AppleReconciliation['state'], accessUntil: number | null = null): AppleReconciliation =>
    ({ state, accessUntil, checkedAt: Date.now(), transaction })
  if (transaction.productId === 'ch.moovx.app.athena.lifetime') {
    return result(transaction.revocationDate === null ? 'lifetime' : 'revoked')
  }

  // An old transaction may be expired/refunded while a later renewal is active.
  const response = await request(() => api.getAllSubscriptionStatuses(transaction.originalTransactionId))
  if (response.environment !== context.environment || response.bundleId !== 'ch.moovx.app' ||
      (context.environment === Environment.PRODUCTION && response.appAppleId !== 6815356426) ||
      !Array.isArray(response.data)) invalid()
  const entries = response.data.filter(group => group.subscriptionGroupIdentifier === '22425039')
    .flatMap(group => group.lastTransactions ?? [])
    .filter(entry => entry.originalTransactionId === seed.originalTransactionId)
  if (entries.length !== 1 || !entries[0].signedTransactionInfo) invalid()
  const entry = entries[0]
  const latest = await verifyAppleTransaction(entry.signedTransactionInfo!, context, verifier)
  if (latest.originalTransactionId !== seed.originalTransactionId || latest.expiresDate === null ||
      latest.purchaseDate < transaction.purchaseDate || latest.signedDate < transaction.signedDate) invalid()
  transaction = latest
  if (transaction.revocationDate !== null || entry.status === Status.REVOKED) return result('revoked')
  if (transaction.isUpgraded) return result('replaced')
  if (entry.status === Status.EXPIRED) return result('expired')
  if (entry.status === Status.BILLING_RETRY) return result('billing_retry')
  if (entry.status === Status.ACTIVE) {
    return transaction.expiresDate! > Date.now() ? result('active', transaction.expiresDate) : result('expired')
  }
  if (entry.status === Status.BILLING_GRACE_PERIOD) {
    if (!entry.signedRenewalInfo || entry.signedRenewalInfo.length > 32768) invalid()
    let renewal
    try { renewal = await verifier.verifyAndDecodeRenewalInfo(entry.signedRenewalInfo) } catch { invalid() }
    const until = renewal.gracePeriodExpiresDate
    if (renewal.environment !== context.environment || renewal.originalTransactionId !== transaction.originalTransactionId ||
        renewal.productId !== transaction.productId ||
        (renewal.appAccountToken !== undefined && renewal.appAccountToken.toLowerCase() !== transaction.appAccountToken) ||
        !Number.isSafeInteger(renewal.signedDate) || renewal.signedDate! <= 0 || renewal.signedDate! > Date.now() + 300_000 ||
        !Number.isSafeInteger(until) || until! <= transaction.expiresDate! || until! >= 8640000000000000) invalid()
    return until! > Date.now() ? result('grace', until!) : result('expired')
  }
  invalid()
}
