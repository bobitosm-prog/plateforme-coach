import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'

function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for log-error')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

export async function POST(req: NextRequest) {
  // Rate limit all callers (10 req/min/IP) to prevent spam
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`log-error:${ip}`, 10, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

  try {
    const { level, message, details, page_url } = await req.json()
    if (!level || !message) return NextResponse.json({ error: 'level and message required' }, { status: 400 })

    // Try auth — not required (pre-login errors need logging too)
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      const cookieStore = await cookies()
      const supabaseAuth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
      )
      const { data: { user } } = await supabaseAuth.auth.getUser()
      userId = user?.id ?? null
      userEmail = user?.email ?? null
    } catch {}

    const supabase = getServiceSupabase()
    await supabase.from('app_logs').insert({
      level, message,
      details: details ?? null,
      user_id: userId,
      user_email: userEmail,
      page_url: page_url ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[log-error]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
