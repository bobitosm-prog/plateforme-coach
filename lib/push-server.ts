import 'server-only'
import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireNotificationDestination } from './notifications/destination'

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return true
  const pub = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').replace(/=/g, '').trim()
  const priv = (process.env.VAPID_PRIVATE_KEY || '').replace(/=/g, '').trim()
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@moovx.ch'
  if (!pub || !priv) return false
  webpush.setVapidDetails(subject, pub, priv)
  vapidConfigured = true
  return true
}

/**
 * Send a push notification to all subscriptions of a user.
 * Cleans expired subscriptions (410/404) automatically.
 * Requires a service_role Supabase client (bypasses RLS on push_subscriptions).
 */
export async function sendPushToUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
  message: { title: string; body: string; url?: string; tag?: string }
): Promise<{ sent: number; failed: number }> {
  const url = requireNotificationDestination(message.url ?? '/')
  if (!ensureVapid()) {
    console.error('[push-server] VAPID keys missing')
    return { sent: 0, failed: 0 }
  }

  const { data: rows } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId)
    .limit(100)

  if (!rows?.length) return { sent: 0, failed: 0 }

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    url,
    tag: message.tag || 'moovx-msg',
  })

  let sent = 0
  let failed = 0
  const toDelete: string[] = []

  for (const sub of rows) {
    try {
      if (process.env.MOOVX_E2E === '1') {
        const endpoint = new URL(sub.subscription.endpoint)
        if (endpoint.protocol !== 'https:' || !['127.0.0.1', 'localhost'].includes(endpoint.hostname)) {
          throw new Error('E2E push endpoint must be local HTTPS')
        }
      }
      await webpush.sendNotification(sub.subscription, payload)
      sent++
    } catch (err: unknown) {
      failed++
      const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err
        ? (err as { statusCode?: unknown }).statusCode
        : undefined
      if (statusCode === 410 || statusCode === 404) {
        toDelete.push(sub.id)
      }
    }
  }

  if (toDelete.length) {
    await supabaseAdmin.from('push_subscriptions').delete().in('id', toDelete)
    console.log(`[push-server] Cleaned ${toDelete.length} expired subscriptions for ${userId.slice(0, 8)}`)
  }

  return { sent, failed }
}
