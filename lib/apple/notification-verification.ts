import 'server-only'
import { Environment, VerificationException, VerificationStatus, type SignedDataVerifier } from '@apple/app-store-server-library'
import { getAppleSignedDataVerifier, type AppleEnvironment } from './transaction-verification'

export const MAX_APPLE_NOTIFICATION_BYTES = 131072
export class AppleNotificationVerificationError extends Error {
  constructor(public readonly retryable: boolean) {
    super(retryable ? 'APPLE_NOTIFICATION_VERIFICATION_UNAVAILABLE' : 'APPLE_NOTIFICATION_INVALID')
  }
}
export interface VerifiedAppleNotification {
  environment: AppleEnvironment
  notificationId: string
  notificationType: string
  subtype: string | null
  signedDate: number
  signedPayload: string
  signedTransactionInfo: string | null
}

/** Verifies the envelope only. The worker must separately verify nested evidence. */
export async function verifyAppleNotification(
  signedPayload: string, environment: AppleEnvironment,
  verifier?: Pick<SignedDataVerifier, 'verifyAndDecodeNotification'>,
): Promise<VerifiedAppleNotification> {
  const invalid = () => { throw new AppleNotificationVerificationError(false) }
  if ((environment !== Environment.SANDBOX && environment !== Environment.PRODUCTION) ||
      typeof signedPayload !== 'string' || Buffer.byteLength(signedPayload) > MAX_APPLE_NOTIFICATION_BYTES ||
      signedPayload.split('.').length !== 3) invalid()
  let payload
  try {
    payload = await (verifier ?? getAppleSignedDataVerifier(environment)).verifyAndDecodeNotification(signedPayload)
  } catch (error) {
    throw new AppleNotificationVerificationError(error instanceof VerificationException &&
      error.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE)
  }
  const { notificationUUID, notificationType, signedDate, subtype } = payload
  // Do not reject old signed dates: Apple's retries/history may arrive days later.
  if (payload.version !== '2.0' || !notificationUUID ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notificationUUID) ||
      !notificationType || !/^[A-Z0-9_]{1,64}$/.test(notificationType) ||
      (subtype !== undefined && !/^[A-Z0-9_]{1,64}$/.test(subtype)) ||
      !Number.isSafeInteger(signedDate) || signedDate! <= 0 || signedDate! > Date.now() + 300000) invalid()
  const scopes = [payload.data, payload.summary, payload.externalPurchaseToken, payload.appData].filter(Boolean)
  if (scopes.length !== 1) invalid()
  const scope = scopes[0]!
  if (scope.bundleId !== 'ch.moovx.app' ||
      (environment === Environment.PRODUCTION && scope.appAppleId !== 6815356426)) invalid()
  // The official verifier checks environment for every scope, including external tokens.
  return { environment, notificationId: notificationUUID!.toLowerCase(), notificationType: notificationType!,
    subtype: subtype ?? null, signedDate: signedDate!, signedPayload,
    signedTransactionInfo: payload.data?.signedTransactionInfo ?? null }
}
