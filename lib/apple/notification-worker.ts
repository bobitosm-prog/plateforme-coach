import 'server-only'
import { Environment, VerificationException, VerificationStatus, type JWSTransactionDecodedPayload } from '@apple/app-store-server-library'
import { AppleNotificationVerificationError, verifyAppleNotification, type VerifiedAppleNotification } from './notification-verification'
import { AppleTransactionVerificationError, getAppleSignedDataVerifier, verifyAppleTransaction,
  type AppleEnvironment, type VerifiedAppleTransaction } from './transaction-verification'
import { reconcileApplePurchase, type AppleReconciliation } from './reconciliation'
import type { ClaimedAppleNotification } from './notification-worker-repository'

const EVENTS = new Set(['SUBSCRIBED', 'DID_RENEW', 'EXPIRED', 'DID_FAIL_TO_RENEW', 'GRACE_PERIOD_EXPIRED',
  'DID_CHANGE_RENEWAL_PREF', 'DID_CHANGE_RENEWAL_STATUS', 'OFFER_REDEEMED', 'PRICE_INCREASE', 'PRICE_CHANGE',
  'REFUND', 'REFUND_DECLINED', 'REFUND_REVERSED', 'REVOKE', 'RENEWAL_EXTENDED', 'ONE_TIME_CHARGE'])
export interface AppleWorkerDependencies {
  claim(environment: AppleEnvironment): Promise<ClaimedAppleNotification | null>
  envelope: typeof verifyAppleNotification
  decode(jws: string, environment: AppleEnvironment): Promise<JWSTransactionDecodedPayload>
  binding(environment: AppleEnvironment, token: string): Promise<string | null>
  transaction: typeof verifyAppleTransaction
  reconcile: typeof reconcileApplePurchase
  complete(event: ClaimedAppleNotification, userId: string, result: AppleReconciliation): Promise<'processed' | 'stale'>
  fail(event: ClaimedAppleNotification, retry: boolean, code: string): Promise<void>
}
const defaults: AppleWorkerDependencies = {
  claim: async environment => (await import('./notification-worker-repository')).claimAppleNotification(environment),
  envelope: verifyAppleNotification,
  decode: (jws, environment) => getAppleSignedDataVerifier(environment).verifyAndDecodeTransaction(jws),
  binding: async (environment, token) => (await import('./notification-worker-repository')).findAppleBindingUser(environment, token),
  transaction: verifyAppleTransaction,
  reconcile: reconcileApplePurchase,
  complete: async (...args) => (await import('./notification-worker-repository')).completeAppleNotification(...args),
  fail: async (...args) => (await import('./notification-worker-repository')).failAppleNotification(...args),
}
class Quarantine extends Error {
  constructor(public readonly code: string) { super(code) }
}

/** One leased event, invoked by the authenticated server scheduler. */
export async function processOneAppleNotification(environment: AppleEnvironment,
  dependencies: AppleWorkerDependencies = defaults): Promise<'idle' | 'processed' | 'stale' | 'retry' | 'quarantined'> {
  if (environment !== Environment.SANDBOX && environment !== Environment.PRODUCTION) throw new Error('APPLE_INVALID_ENVIRONMENT')
  const event = await dependencies.claim(environment)
  if (!event) return 'idle'
  try {
    const envelope: VerifiedAppleNotification = await dependencies.envelope(event.signedPayload, environment)
    if (envelope.notificationId !== event.notificationId || event.environment !== environment) {
      throw new Quarantine('APPLE_EVENT_MISMATCH')
    }
    if (!EVENTS.has(envelope.notificationType)) throw new Quarantine('APPLE_UNSUPPORTED_EVENT')
    const jws = envelope.signedTransactionInfo
    if (!jws || Buffer.byteLength(jws) > 32768) throw new Quarantine('APPLE_MISSING_TRANSACTION')
    // This decode verifies the nested signature; its token only selects a server-owned binding.
    const decoded = await dependencies.decode(jws, environment)
    const token = decoded.appAccountToken
    if (!token) throw new Quarantine('APPLE_UNBOUND_ACCOUNT')
    const userId = await dependencies.binding(environment, token.toLowerCase())
    if (!userId) throw new Quarantine('APPLE_UNBOUND_ACCOUNT')
    const context = { environment, expectedAccountToken: token.toLowerCase() }
    const transaction: VerifiedAppleTransaction = await dependencies.transaction(jws, context)
    const observation = await dependencies.reconcile(transaction, context)
    return await dependencies.complete(event, userId, observation)
  } catch (error) {
    let code = 'APPLE_PROCESSING_UNAVAILABLE'
    let retry = true
    if (error instanceof VerificationException && error.status !== VerificationStatus.RETRYABLE_VERIFICATION_FAILURE) {
      code = 'APPLE_INVALID_TRANSACTION'; retry = false
    }
    if (error instanceof Quarantine) { code = error.code; retry = false }
    if (error instanceof AppleNotificationVerificationError && !error.retryable) {
      code = 'APPLE_NOTIFICATION_INVALID'; retry = false
    }
    if (error instanceof AppleTransactionVerificationError && error.code !== 'APPLE_VERIFICATION_UNAVAILABLE') {
      code = error.code; retry = false
    }
    if (error instanceof Error && error.message === 'APPLE_RECONCILIATION_INVALID') {
      code = 'APPLE_RECONCILIATION_INVALID'; retry = false
    }
    await dependencies.fail(event, retry, code)
    return retry ? 'retry' : 'quarantined'
  }
}
