import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { prepareAppleAccountBinding } from '@/lib/apple/purchase-ledger'
import { purchaseEnvironment, syncApplePurchase } from '@/lib/apple/purchase-service'
import { AppleTransactionVerificationError } from '@/lib/apple/transaction-verification'
import { verifiedPurchaseEnvironment, purchaseEnvironmentEnabled } from '@/lib/apple/environment'
export const runtime = 'nodejs'
export const maxDuration = 60
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
async function authorize(request: Request) {
  if (process.env.APPLE_IAP_PURCHASES_ENABLED !== 'true') return reply({ error: 'APPLE_UNAVAILABLE' }, 503)
  // Cookie-authenticated POSTs must originate from this application, never a third-party site.
  if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'APPLE_ORIGIN_INVALID' }, 403)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`apple-purchases:ip:${ip}`, 60, 60000).allowed) return reply({ error: 'APPLE_RATE_LIMIT' }, 429)
  const client = await createSupabaseRouteClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return reply({ error: 'APPLE_UNAUTHORIZED' }, 401)
  if (!checkRateLimit(`apple-purchases:user:${user.id}`, 30, 60000).allowed) return reply({ error: 'APPLE_RATE_LIMIT' }, 429)
  return user.id
}
export async function GET(request: Request) {
  try {
    const userId = await authorize(request)
    if (userId instanceof Response) return userId
    const environment = purchaseEnvironment(userId)
    if (!purchaseEnvironmentEnabled(environment, userId)) return reply({ error: 'APPLE_UNAVAILABLE' }, 503)
    return reply({ userId, environment, appAccountToken: await prepareAppleAccountBinding(userId, environment) })
  } catch { return reply({ error: 'APPLE_UNAVAILABLE' }, 503) }
}
export async function POST(request: Request) {
  try {
    const userId = await authorize(request)
    if (userId instanceof Response) return userId
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return reply({ error: 'APPLE_INVALID_BODY' }, 415)
    if (!request.body) return reply({ error: 'APPLE_INVALID_BODY' }, 400)
    const reader = request.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 68000) { await reader.cancel(); return reply({ error: 'APPLE_INVALID_BODY' }, 413) }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
    let body
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return reply({ error: 'APPLE_INVALID_BODY' }, 400) }
    if (body?.userId !== userId) return reply({ error: 'APPLE_ACCOUNT_CHANGED' }, 409)
    const environment = body.signedAppTransaction === undefined
      ? purchaseEnvironment(userId) : await verifiedPurchaseEnvironment(body.signedAppTransaction)
    if (!purchaseEnvironmentEnabled(environment, userId)) return reply({ error: 'APPLE_UNAVAILABLE' }, 503)
    if (body.action === 'prepare') {
      if (body.signedAppTransaction === undefined) return reply({ error: 'APPLE_INVALID_BODY' }, 400)
      return reply({ userId, environment, appAccountToken: await prepareAppleAccountBinding(userId, environment) })
    }
    if (typeof body?.signedTransaction !== 'string' || body.signedTransaction.length > 32768) return reply({ error: 'APPLE_INVALID_BODY' }, 400)
    return reply(await syncApplePurchase(userId, body.signedTransaction, environment))
  } catch (error) {
    const invalid = error instanceof AppleTransactionVerificationError && error.code !== 'APPLE_VERIFICATION_UNAVAILABLE'
    return reply({ error: invalid ? 'APPLE_TRANSACTION_INVALID' : 'APPLE_SYNC_UNAVAILABLE' }, invalid ? 400 : 503)
  }
}
