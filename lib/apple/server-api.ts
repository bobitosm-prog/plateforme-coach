import 'server-only'
import { BoundedAppleAPIClient } from './bounded-api-client'
import { createPrivateKey } from 'node:crypto'
import { AppStoreServerAPIClient, Environment } from '@apple/app-store-server-library'
import type { AppleEnvironment } from './transaction-verification'

/** Separate In-App Purchase key; never reuse Apple Sign In credentials. */
export function createAppleServerAPIClient(environment: AppleEnvironment): AppStoreServerAPIClient {
  if (environment !== Environment.PRODUCTION && environment !== Environment.SANDBOX) {
    throw new Error('APPLE_API_INVALID_ENVIRONMENT')
  }
  const key = process.env.APPLE_IAP_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const keyId = process.env.APPLE_IAP_KEY_ID
  const issuerId = process.env.APPLE_IAP_ISSUER_ID
  if (!key || !keyId || !/^[A-Z0-9]{10}$/.test(keyId) || !issuerId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(issuerId)) {
    throw new Error('APPLE_API_NOT_CONFIGURED')
  }
  try {
    const parsed = createPrivateKey(key)
    if (parsed.asymmetricKeyType !== 'ec' || parsed.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
      throw new Error('INVALID_KEY')
    }
    return new BoundedAppleAPIClient(key, keyId, issuerId, 'ch.moovx.app', environment)
  } catch {
    throw new Error('APPLE_API_NOT_CONFIGURED')
  }
}
