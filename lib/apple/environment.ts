import 'server-only'
import { Environment } from '@apple/app-store-server-library'
import { getAppleSignedDataVerifier, AppleTransactionVerificationError, type AppleEnvironment } from './transaction-verification'
import { VerificationException, VerificationStatus, type SignedDataVerifier } from '@apple/app-store-server-library'
/** Only server configuration may select a sandbox test account. Never a header/body/metadata flag. */
export function purchaseEnvironment(userId: string): AppleEnvironment {
  const testers = (process.env.APPLE_IAP_SANDBOX_USER_IDS ?? '').split(',').map(id => id.trim()).filter(Boolean)
  return testers.includes(userId) ? Environment.SANDBOX : Environment.PRODUCTION
}

/** A signed app receipt selects the store, never an untrusted environment flag. */
export async function verifiedPurchaseEnvironment(signedAppTransaction: string,
  verifierFor = getAppleSignedDataVerifier as (environment: AppleEnvironment) => Pick<SignedDataVerifier, 'verifyAndDecodeAppTransaction'>,
): Promise<AppleEnvironment> {
  if (typeof signedAppTransaction !== 'string' || signedAppTransaction.length > 32768 || signedAppTransaction.split('.').length !== 3)
    throw new AppleTransactionVerificationError('APPLE_INVALID_TRANSACTION')
  for (const environment of [Environment.SANDBOX, Environment.PRODUCTION] as const) {
    try {
      const proof = await verifierFor(environment).verifyAndDecodeAppTransaction(signedAppTransaction)
      if (proof.bundleId !== 'ch.moovx.app' || proof.receiptType !== environment ||
          (environment === Environment.PRODUCTION && proof.appAppleId !== 6815356426))
        throw new AppleTransactionVerificationError('APPLE_INVALID_TRANSACTION')
      return environment
    } catch (error) {
      // Only an authenticated environment mismatch permits trying Apple's other store.
      if (error instanceof VerificationException && error.status === VerificationStatus.INVALID_ENVIRONMENT && environment === Environment.SANDBOX) continue
      if (error instanceof VerificationException && error.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE)
        throw new AppleTransactionVerificationError('APPLE_VERIFICATION_UNAVAILABLE')
      throw new AppleTransactionVerificationError('APPLE_INVALID_TRANSACTION')
    }
  }
  throw new AppleTransactionVerificationError('APPLE_INVALID_TRANSACTION')
}
export function sandboxPurchasesEnabled(): boolean {
  return process.env.APPLE_IAP_SANDBOX_ENABLED === 'true'
}
export function purchaseEnvironmentEnabled(environment: AppleEnvironment, userId: string): boolean {
  return environment === Environment.SANDBOX
    ? sandboxPurchasesEnabled() || purchaseEnvironment(userId) === Environment.SANDBOX
    : process.env.APPLE_IAP_ENTITLEMENTS_ENABLED === 'true' && process.env.APPLE_IAP_PRODUCTION_PURCHASES_ENABLED === 'true'
}
