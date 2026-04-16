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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: rows, error: dbError } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .limit(100)


  if (!rows?.length) return NextResponse.json({ sent: 0 })

  const results = await Promise.allSettled(
    rows.map(row =>
      webpush.sendNotification(row.subscription, JSON.stringify({ title, body, url: url || '/' }))
    )
  )

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
    } else {
      console.error(`[send-notification] push ${i} failed:`, result.reason)
    }
  })

  return NextResponse.json({ sent: rows.length })
}
