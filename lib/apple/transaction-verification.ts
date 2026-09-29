import 'server-only'
import {
  Environment,
  InAppOwnershipType,
  SignedDataVerifier,
  Type,
  VerificationException,
  VerificationStatus,
  type JWSTransactionDecodedPayload,
} from '@apple/app-store-server-library'
import roots from './root-certificates.json'

const BUNDLE_ID = 'ch.moovx.app'
const APP_ID = 6815356426
const GROUP_ID = '22425039'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const APPLE_ID = /^\d{1,40}$/
const PRODUCTS = {
  'ch.moovx.app.athena.monthly': Type.AUTO_RENEWABLE_SUBSCRIPTION,
  'ch.moovx.app.athena.yearly': Type.AUTO_RENEWABLE_SUBSCRIPTION,
  'ch.moovx.app.athena.lifetime': Type.NON_CONSUMABLE,
} as const

export type AppleEnvironment = Environment.PRODUCTION | Environment.SANDBOX
export type AppleProductId = keyof typeof PRODUCTS
export type AppleVerificationErrorCode =
  | 'APPLE_INVALID_TRANSACTION'
  | 'APPLE_ACCOUNT_MISMATCH'
  | 'APPLE_VERIFICATION_UNAVAILABLE'

export class AppleTransactionVerificationError extends Error {
  constructor(public readonly code: AppleVerificationErrorCode) {
    // Never include a signed transaction, Apple identifier or account token in errors.
    super(code)
    this.name = 'AppleTransactionVerificationError'
  }
}

/** Signed evidence, NOT a current entitlement: refunds can postdate this payload. */
export interface VerifiedAppleTransaction {
  environment: AppleEnvironment
  transactionId: string
  originalTransactionId: string
  productId: AppleProductId
  appAccountToken: string
  purchaseDate: number
  signedDate: number
  expiresDate: number | null
  revocationDate: number | null
  isUpgraded: boolean
}

const verifiers = new Map<AppleEnvironment, SignedDataVerifier>()
export function getAppleSignedDataVerifier(environment: AppleEnvironment): SignedDataVerifier {
  if (environment !== Environment.PRODUCTION && environment !== Environment.SANDBOX) invalid()
  let verifier = verifiers.get(environment)
  if (!verifier) {
    // Official public Apple roots bundled for server deployments. Always check OCSP.
    verifier = new SignedDataVerifier(
      roots.map(root => Buffer.from(root.der, 'base64')),
      true, environment, BUNDLE_ID, APP_ID,
    )
    verifiers.set(environment, verifier)
  }
  return verifier
}

function invalid(): never {
  throw new AppleTransactionVerificationError('APPLE_INVALID_TRANSACTION')
}
function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value < 8640000000000000
}

/**
 * Caller must supply environment from server configuration and expectedAccountToken
 * from the authenticated user's server-owned binding, never from the request body.
 * `verifier` is a trusted dependency for crypto runtime tests, not an HTTP option.
 * Before granting access, reconcile with current Apple API state and atomically
 * persist ownership by environment/originalTransactionId. This function does neither.
 */
export async function verifyAppleTransaction(
  signedTransaction: string,
  context: { environment: AppleEnvironment; expectedAccountToken: string },
  verifier?: Pick<SignedDataVerifier, 'verifyAndDecodeTransaction'>,
): Promise<VerifiedAppleTransaction> {
  const { environment, expectedAccountToken } = context
  // The Apple library skips signature checks for Xcode/LocalTesting: never allow them.
  if (environment !== Environment.PRODUCTION && environment !== Environment.SANDBOX) invalid()
  if (!UUID.test(expectedAccountToken) || typeof signedTransaction !== 'string' ||
      signedTransaction.length > 32768 || signedTransaction.split('.').length !== 3) invalid()

  let payload: JWSTransactionDecodedPayload
  try {
    payload = await (verifier ?? getAppleSignedDataVerifier(environment)).verifyAndDecodeTransaction(signedTransaction)
  } catch (error) {
    if (error instanceof VerificationException && error.status === VerificationStatus.RETRYABLE_VERIFICATION_FAILURE) {
      throw new AppleTransactionVerificationError('APPLE_VERIFICATION_UNAVAILABLE')
    }
    invalid()
  }

  const { productId, transactionId, originalTransactionId, appAccountToken, purchaseDate, signedDate } = payload
  if (payload.bundleId !== BUNDLE_ID || payload.environment !== environment ||
      !productId || !Object.hasOwn(PRODUCTS, productId) ||
      payload.type !== PRODUCTS[productId as AppleProductId] ||
      payload.inAppOwnershipType !== InAppOwnershipType.PURCHASED || payload.quantity !== 1 ||
      !transactionId || !APPLE_ID.test(transactionId) ||
      !originalTransactionId || !APPLE_ID.test(originalTransactionId) ||
      !timestamp(purchaseDate) || !timestamp(signedDate) || purchaseDate > signedDate ||
      signedDate > Date.now() + 300_000) invalid()

  if (!appAccountToken || !UUID.test(appAccountToken) ||
      appAccountToken.toLowerCase() !== expectedAccountToken.toLowerCase()) {
    throw new AppleTransactionVerificationError('APPLE_ACCOUNT_MISMATCH')
  }
  const subscription = payload.type === Type.AUTO_RENEWABLE_SUBSCRIPTION
  if (subscription && (payload.subscriptionGroupIdentifier !== GROUP_ID ||
      !timestamp(payload.expiresDate) || payload.expiresDate <= purchaseDate)) invalid()
  if (!subscription && payload.expiresDate !== undefined) invalid()
  if (payload.revocationDate !== undefined &&
      (!timestamp(payload.revocationDate) || payload.revocationDate < purchaseDate || payload.revocationDate > signedDate)) invalid()
  if (payload.revocationReason !== undefined && payload.revocationDate === undefined) invalid()

  return {
    environment, transactionId, originalTransactionId,
    productId: productId as AppleProductId,
    appAccountToken: appAccountToken.toLowerCase(), purchaseDate, signedDate,
    expiresDate: payload.expiresDate ?? null,
    revocationDate: payload.revocationDate ?? null,
    isUpgraded: payload.isUpgraded === true,
  }
}
