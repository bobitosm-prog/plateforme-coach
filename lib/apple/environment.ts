import 'server-only'
import { Environment } from '@apple/app-store-server-library'
import type { AppleEnvironment } from './transaction-verification'
/** Only server configuration may select a sandbox test account. Never a header/body/metadata flag. */
export function purchaseEnvironment(userId: string): AppleEnvironment {
  const testers = (process.env.APPLE_IAP_SANDBOX_USER_IDS ?? '').split(',').map(id => id.trim()).filter(Boolean)
  return testers.includes(userId) ? Environment.SANDBOX : Environment.PRODUCTION
}
