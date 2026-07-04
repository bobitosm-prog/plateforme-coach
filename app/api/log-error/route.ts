import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'

const VALID_LEVELS = new Set(['info', 'warning', 'error', 'critical'])

export async function POST(req: NextRequest) {
  // Rate limit all callers (10 req/min/IP) to prevent spam
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`log-error:${ip}`, 10, 60000)
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 })

  try {
    const body = await req.json()
    const rawLevel = body?.level
    const rawMessage = body?.message
    if (!rawMessage) return NextResponse.json({ ok: false }, { status: 400 })

    // Validate & bound inputs (client may lie)
    const level = VALID_LEVELS.has(rawLevel) ? rawLevel : 'error'
    const message = String(rawMessage).slice(0, 500)
    const page_url = body?.page_url ? String(body.page_url).slice(0, 500) : null
    const details = body?.details ? String(body.details).slice(0, 2000) : null

    // Auth client (anon key + cookies) — auth optional (pre-login errors)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    // Derive user_id server-side only (never from body — anti-spoofing)
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
      userEmail = user?.email ?? null
    } catch {}

    // INSERT via RLS policy app_logs_insert_safe (user_id NULL or auth.uid())
    await supabase.from('app_logs').insert({
      level, message, details,
      user_id: userId,
      user_email: userEmail,
      page_url,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    // Log server-side only — never leak internal details to client
    console.error('[log-error]', e?.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
