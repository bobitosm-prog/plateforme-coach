import 'server-only'
import { Environment } from '@apple/app-store-server-library'
import { checkRateLimit } from '@/lib/rate-limit'
import { AppleNotificationVerificationError, MAX_APPLE_NOTIFICATION_BYTES, verifyAppleNotification,
  type VerifiedAppleNotification } from './notification-verification'
import type { AppleEnvironment } from './transaction-verification'

interface Dependencies {
  enabled(environment: AppleEnvironment): boolean
  allow(environment: AppleEnvironment): boolean
  verify: typeof verifyAppleNotification
  enqueue(event: VerifiedAppleNotification): Promise<'inserted' | 'duplicate'>
}
const defaults: Dependencies = {
  enabled: environment => process.env[environment === Environment.SANDBOX
    ? 'APPLE_IAP_SANDBOX_NOTIFICATIONS_ENABLED' : 'APPLE_IAP_PRODUCTION_NOTIFICATIONS_ENABLED'] === 'true',
  allow: environment => checkRateLimit(`apple-notifications:${environment}`, 300, 60000).allowed,
  verify: verifyAppleNotification,
  // Disabled endpoints must not initialize service credentials or touch the database.
  enqueue: async event => (await import('./notification-inbox')).enqueueAppleNotification(event),
}

async function readBoundedBody(request: Request): Promise<string> {
  if (!request.body) throw new Error('INVALID_BODY')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      // Allow a small JSON wrapper in addition to the bounded JWS.
      if (length > MAX_APPLE_NOTIFICATION_BYTES + 1024) {
        await reader.cancel()
        throw new Error('BODY_TOO_LARGE')
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
}

/** Apple authenticates with JWS, not a browser session or client-provided token. */
export async function handleAppleNotification(request: Request, routeEnvironment: string,
  dependencies: Dependencies = defaults): Promise<Response> {
  const environment = routeEnvironment === 'sandbox' ? Environment.SANDBOX
    : routeEnvironment === 'production' ? Environment.PRODUCTION : null
  if (!environment) return new Response(null, { status: 404 })
  if (!dependencies.enabled(environment)) return new Response(null, { status: 503 })
  if (!dependencies.allow(environment)) return new Response(null, { status: 429, headers: { 'Retry-After': '60' } })
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return new Response(null, { status: 415 })
  }
  let signedPayload: string
  try {
    const body = JSON.parse(await readBoundedBody(request))
    if (!body || typeof body.signedPayload !== 'string') throw new Error('INVALID_BODY')
    signedPayload = body.signedPayload
  } catch (error) {
    return new Response(null, { status: error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 413 : 400 })
  }
  let event: VerifiedAppleNotification
  try { event = await dependencies.verify(signedPayload, environment) } catch (error) {
    return new Response(null, { status: error instanceof AppleNotificationVerificationError && !error.retryable ? 400 : 503 })
  }
  try {
    await dependencies.enqueue(event)
    // Success means durable receipt, NOT successful entitlement processing.
    return new Response(null, { status: 200 })
  } catch { return new Response(null, { status: 503 }) }
}
