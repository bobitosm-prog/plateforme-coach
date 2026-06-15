import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeStreak } from '../../../../lib/streak'
import { getSessionForDay } from '../../../../lib/get-today-session'
import { sendPushToUser } from '../../../../lib/push-server'

export const maxDuration = 60

type MsgGen = (sessionName: string, streakDays: number) => { title: string; body: string }

const MESSAGES_WITH_STREAK: Record<string, MsgGen> = {
  fr: (name, n) => ({
    title: `Ton streak de ${n} jours est en jeu`,
    body: `Ta séance ${name} t'attend — garde le rythme !`,
  }),
  en: (name, n) => ({
    title: `Your ${n}-day streak is at risk`,
    body: `Your ${name} session awaits — keep the momentum!`,
  }),
  de: (name, n) => ({
    title: `Dein ${n}-Tage-Streak ist in Gefahr`,
    body: `Dein ${name}-Training wartet — bleib dran!`,
  }),
}

const MESSAGES_NO_STREAK: Record<string, (name: string) => { title: string; body: string }> = {
  fr: (name) => ({
    title: `Séance ${name} prévue aujourd'hui`,
    body: 'Il te reste du temps — lance-toi !',
  }),
  en: (name) => ({
    title: `${name} session planned today`,
    body: "There's still time — go for it!",
  }),
  de: (name) => ({
    title: `${name}-Training heute geplant`,
    body: 'Du hast noch Zeit — los geht\'s!',
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

/** Get Monday-first day index (0=Mon..6=Sun) in Europe/Zurich */
function zurichDayIndex(): number {
  const dayStr = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Zurich', weekday: 'long' })
  const map: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }
  return map[dayStr] ?? 0
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

  const dayIdx = zurichDayIndex()

  // 5. PER-USER: check program, session done, streak → send or skip
  for (const user of eligible) {
    processed++
    const uid = user.id
    const tag = uid.slice(0, 8)

    // 5a. Load active program
    const { data: program } = await supabaseAdmin
      .from('custom_programs')
      .select('days')
      .eq('user_id', uid)
      .eq('is_active', true)
      .maybeSingle()

    if (!program?.days) {
      console.log(`[streak-reminder] ${tag} no active program -> skip`)
      skipped++
      continue
    }

    // 5b. Check if today is a rest day
    const todaySession = getSessionForDay(program.days, dayIdx)
    if (todaySession.type === 'rest') {
      console.log(`[streak-reminder] ${tag} rest day -> skip`)
      skipped++
      continue
    }

    // 5c. Check if user already completed a session today
    const { count: doneCount } = await supabaseAdmin
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('completed', true)
      .eq('date', todayZurich)

    if ((doneCount ?? 0) > 0) {
      console.log(`[streak-reminder] ${tag} session done today -> skip`)
      skipped++
      continue
    }

    // 5d. Compute streak for message adaptation
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString()
    const { data: sessions } = await supabaseAdmin
      .from('workout_sessions')
      .select('created_at')
      .eq('user_id', uid)
      .eq('completed', true)
      .gte('created_at', sixtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(200)

    const streakDates = (sessions || []).map(s => toZurichDate(new Date(s.created_at)))
    const streak = computeStreak(streakDates, todayZurich)
    const locale = user.preferred_locale || 'fr'
    const sessionName = todaySession.name

    // 5e. Build message: streak-aware or generic
    let msg: { title: string; body: string }
    if (streak.current >= 1) {
      const fn = MESSAGES_WITH_STREAK[locale] || MESSAGES_WITH_STREAK.fr
      msg = fn(sessionName, streak.current)
    } else {
      const fn = MESSAGES_NO_STREAK[locale] || MESSAGES_NO_STREAK.fr
      msg = fn(sessionName)
    }

    const result = await sendPushToUser(supabaseAdmin, uid, {
      title: msg.title,
      body: msg.body,
      url: '/',
      tag: 'streak-reminder',
    })

    if (result.sent > 0) {
      sent++
      await supabaseAdmin.from('profiles').update({ last_streak_reminder_at: new Date().toISOString() }).eq('id', uid)
      console.log(`[streak-reminder] ${tag} streak=${streak.current} session="${sessionName}" -> sent`)
    } else {
      console.log(`[streak-reminder] ${tag} push failed (${result.failed})`)
      skipped++
    }
  }

  console.log(`[streak-reminder] Done: processed=${processed} sent=${sent} skipped=${skipped}`)
  return NextResponse.json({ processed, sent, skipped })
}
