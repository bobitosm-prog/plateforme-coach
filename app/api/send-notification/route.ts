export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  console.log('[send-notification] route called')
  console.log('[send-notification] env check:', {
    VAPID_SUBJECT: !!process.env.VAPID_SUBJECT,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: !!process.env.VAPID_PRIVATE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  const vapidPublicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
    .replace(/=/g, '')
    .trim()

  const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || '')
    .replace(/=/g, '')
    .trim()

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    vapidPublicKey,
    vapidPrivateKey,
  )

  const { userId, title, body, url } = await req.json()
  console.log('[send-notification] userId received:', userId)

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: rows, error: dbError } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)

  console.log('[send-notification] subscriptions fetched:', rows?.length ?? 0, dbError ? `DB error: ${dbError.message}` : 'no DB error')

  if (!rows?.length) return NextResponse.json({ sent: 0 })

  const results = await Promise.allSettled(
    rows.map(row =>
      webpush.sendNotification(row.subscription, JSON.stringify({ title, body, url: url || '/' }))
    )
  )

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`[send-notification] push ${i} sent, statusCode:`, result.value.statusCode)
    } else {
      console.error(`[send-notification] push ${i} failed:`, result.reason)
    }
  })

  return NextResponse.json({ sent: rows.length })
}
