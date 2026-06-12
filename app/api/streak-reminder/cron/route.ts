import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeStreak } from '../../../../lib/streak'
import { sendPushToUser } from '../../../../lib/push-server'

export const maxDuration = 60

const STREAK_MESSAGES: Record<string, (n: number) => { title: string; body: string }> = {
  fr: (n) => ({
    title: `Ton streak de ${n} jours est en jeu`,
    body: 'Ta seance t\'attend — garde le rythme !',
  }),
  en: (n) => ({
    title: `Your ${n}-day streak is at risk`,
    body: 'Your workout is waiting — keep the momentum!',
  }),
  de: (n) => ({
    title: `Dein ${n}-Tage-Streak ist in Gefahr`,
    body: 'Dein Training wartet — bleib dran!',
  }),
}

/** Convert a Date to YYYY-MM-DD in Europe/Zurich timezone */
function toZurichDate(d: Date): string {
  return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Zurich' })
}

/** Get current hour in Europe/Zurich (0-23) */
function zurichHour(): number {
  return parseInt(new Date().toLocaleString('en-US', { timeZone: 'Europe/Zurich', hour: 'numeric', hour12: false }), 10)
}

export async function POST(req: NextRequest) {
  // 1. AUTH via CRON_SECRET
  const auth = req.headers.get('authorization') || ''
  const expectedSecret = process.env.CRON_SECRET || ''
  if (!expectedSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  if (auth !== `Bearer ${expectedSecret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. TIMEZONE GUARD — only run at 18h Europe/Zurich
  const hour = zurichHour()
  if (hour !== 18) {
    return NextResponse.json({ skipped: 'not 18h local', zurichHour: hour })
  }

  // 3. ADMIN SUPABASE CLIENT
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const todayZurich = toZurichDate(new Date())

  // 4. FETCH ELIGIBLE USERS
  // Clients with onboarding done, having push subscriptions, not reminded today
  const { data: users, error: usersErr } = await supabaseAdmin
    .from('profiles')
    .select('id, preferred_locale, last_streak_reminder_at')
    .eq('role', 'client')
    .eq('onboarding_completed', true)

  if (usersErr || !users?.length) {
    console.log('[streak-reminder] No eligible users or error:', usersErr?.message)
    return NextResponse.json({ processed: 0, sent: 0, skipped: 0 })
  }

  // Filter: not already reminded today
  const candidates = users.filter(u => {
    if (!u.last_streak_reminder_at) return true
    return toZurichDate(new Date(u.last_streak_reminder_at)) !== todayZurich
  })

  // Check which candidates have push subscriptions
  const { data: pushUsers } = await supabaseAdmin
    .from('push_subscriptions')
    .select('user_id')
    .in('user_id', candidates.map(u => u.id))

  const pushUserIds = new Set((pushUsers || []).map((p: any) => p.user_id))
  const eligible = candidates.filter(u => pushUserIds.has(u.id))

  let processed = 0
  let sent = 0
  let skipped = 0

  // 5. PER-USER STREAK CHECK + PUSH
  for (const user of eligible) {
    processed++
    const uid = user.id

    // Fetch completed sessions (last 60 days)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString()
    const { data: sessions } = await supabaseAdmin
      .from('workout_sessions')
      .select('created_at')
      .eq('user_id', uid)
      .eq('completed', true)
      .gte('created_at', sixtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!sessions?.length) { skipped++; continue }

    const dates = sessions.map(s => toZurichDate(new Date(s.created_at)))
    const streak = computeStreak(dates, todayZurich)

    if (!streak.atRisk || streak.current < 3) {
      console.log(`[streak-reminder] ${uid.slice(0, 8)} streak=${streak.current} atRisk=${streak.atRisk} -> skip`)
      skipped++
      continue
    }

    // Send push in user's locale
    const locale = user.preferred_locale || 'fr'
    const msgFn = STREAK_MESSAGES[locale] || STREAK_MESSAGES.fr
    const msg = msgFn(streak.current)

    const result = await sendPushToUser(supabaseAdmin, uid, {
      title: msg.title,
      body: msg.body,
      url: '/',
      tag: 'streak-reminder',
    })

    if (result.sent > 0) {
      sent++
      await supabaseAdmin.from('profiles').update({ last_streak_reminder_at: new Date().toISOString() }).eq('id', uid)
      console.log(`[streak-reminder] ${uid.slice(0, 8)} streak=${streak.current} -> sent`)
    } else {
      console.log(`[streak-reminder] ${uid.slice(0, 8)} streak=${streak.current} -> push failed (${result.failed})`)
      skipped++
    }
  }

  console.log(`[streak-reminder] Done: processed=${processed} sent=${sent} skipped=${skipped}`)
  return NextResponse.json({ processed, sent, skipped })
}
