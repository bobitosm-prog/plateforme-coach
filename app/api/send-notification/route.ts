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
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const vapidPublicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').replace(/=/g, '').trim()
  const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || '').replace(/=/g, '').trim()
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@moovx.ch'

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  const { userId, title, body, url, tag } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: rows, error: dbError } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId)
    .limit(100)


  if (!rows?.length) return NextResponse.json({ sent: 0 })

  const payload = JSON.stringify({ title, body, url: url || '/', tag: tag || 'moovx-msg' })
  const expired: string[] = []

  const results = await Promise.allSettled(
    rows.map(async (row, i) => {
      try {
        await webpush.sendNotification(row.subscription, payload)
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expired.push(row.id || '')
        }
        console.error(`[send-notification] push ${i} failed:`, err?.statusCode || err?.message)
      }
    })
  )

  // Clean expired subscriptions
  if (expired.filter(Boolean).length) {
    await supabase.from('push_subscriptions').delete().in('id', expired.filter(Boolean))
  }

  return NextResponse.json({ sent: rows.length, expired: expired.length })
}
