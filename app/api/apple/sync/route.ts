import { timingSafeEqual } from 'node:crypto'
import { Environment } from '@apple/app-store-server-library'
import { checkRateLimit } from '@/lib/rate-limit'
import { runAppleSync } from '@/lib/apple/sync-worker'
export const runtime = 'nodejs'
export const maxDuration = 120
export async function POST(request: Request) {
  const secret = process.env.APPLE_IAP_CRON_SECRET
  if (!secret || process.env.APPLE_IAP_SYNC_ENABLED !== 'true') return new Response(null, { status: 503 })
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return new Response(null, { status: 401 })
  if (!checkRateLimit('apple-sync-worker', 2, 60000).allowed) return new Response(null, { status: 429 })
  try {
    const results = []
    for (const environment of [Environment.PRODUCTION, Environment.SANDBOX] as const) {
      if (environment === Environment.SANDBOX && !process.env.APPLE_IAP_SANDBOX_USER_IDS?.trim()) continue
      results.push({ environment, ...await runAppleSync(environment) })
    }
    return Response.json({ results }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return Response.json({ error: 'APPLE_SYNC_UNAVAILABLE' }, { status: 503 }) }
}
