export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    console.log('[Push] Auth failed — no user')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const vapidPublicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').replace(/=/g, '').trim()
  const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || '').replace(/=/g, '').trim()
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@moovx.ch'

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('[Push] VAPID keys missing — publicKey:', !!vapidPublicKey, 'privateKey:', !!vapidPrivateKey)
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  const { userId, title, body, url, tag } = await req.json()
  console.log('[Push] Target userId:', userId, '| title:', title)

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[send-notification] SUPABASE_SERVICE_ROLE_KEY missing')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
  )

  const { data: rows, error: dbError } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId)
    .limit(100)

  console.log('[Push] Subs found:', rows?.length || 0, dbError ? `DB error: ${dbError.message}` : '')

  if (!rows?.length) return NextResponse.json({ sent: 0 })

  const payload = JSON.stringify({ title, body, url: url || '/', tag: tag || 'moovx-msg' })
  let sent = 0
  const toDelete: string[] = []

  for (const sub of rows) {
    try {
      const result = await webpush.sendNotification(sub.subscription, payload)
      console.log('[Push] Sent OK, statusCode:', result.statusCode)
      sent++
    } catch (err: any) {
      console.error('[Push] FAILED:', err.statusCode, err.body, err.message)
      if (err.statusCode === 410 || err.statusCode === 404) {
        toDelete.push(sub.id)
      }
    }
  }

  // Clean expired subscriptions
  if (toDelete.length) {
    await supabase.from('push_subscriptions').delete().in('id', toDelete)
  }

  console.log('[Push] Final: sent=', sent, 'cleaned=', toDelete.length)
  return NextResponse.json({ sent, cleaned: toDelete.length })
}
