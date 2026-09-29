import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import { AppStoreServerAPIClient, Environment } from '@apple/app-store-server-library'
import { createAppleServerAPIClient } from '@/lib/apple/server-api'
import type { AppleEnvironment } from '@/lib/apple/transaction-verification'
vi.mock('server-only', () => ({}))
afterEach(() => vi.unstubAllEnvs())
function configure(curve = 'prime256v1') {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: curve })
  vi.stubEnv('APPLE_IAP_PRIVATE_KEY', privateKey.export({ type: 'pkcs8', format: 'pem' }).toString())
  vi.stubEnv('APPLE_IAP_KEY_ID', 'TESTKEY123')
  vi.stubEnv('APPLE_IAP_ISSUER_ID', '00000000-0000-4000-8000-000000000001')
}
describe('Apple In-App Purchase API credentials', () => {
  it('builds a sandbox client with a dedicated EC key without making a purchase', () => {
    configure()
    expect(createAppleServerAPIClient(Environment.SANDBOX)).toBeInstanceOf(AppStoreServerAPIClient)
  })
  it('fails closed without the IAP key, rather than using Sign In credentials', () => {
    configure(); vi.stubEnv('APPLE_IAP_PRIVATE_KEY', '')
    expect(() => createAppleServerAPIClient(Environment.PRODUCTION)).toThrow('APPLE_API_NOT_CONFIGURED')
  })
  it('rejects malformed keys and incorrect curves without exposing parsing errors', () => {
    configure('secp384r1')
    expect(() => createAppleServerAPIClient(Environment.SANDBOX)).toThrow('APPLE_API_NOT_CONFIGURED')
    vi.stubEnv('APPLE_IAP_PRIVATE_KEY', 'invalid-test-key')
    expect(() => createAppleServerAPIClient(Environment.SANDBOX)).toThrow('APPLE_API_NOT_CONFIGURED')
  })
  it('forbids local signature-bypass environments', () => {
    configure()
    expect(() => createAppleServerAPIClient(Environment.XCODE as AppleEnvironment)).toThrow('APPLE_API_INVALID_ENVIRONMENT')
  })
})
