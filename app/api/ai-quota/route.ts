import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, checkAiQuota } from '../../../lib/rate-limit'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`ai-quota:${ip}`, 30, 60000)
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 })

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    const result = await checkAiQuota(supabase, user.id)
    return NextResponse.json({
      remaining: result.remaining,
      limit: result.limit,
      resetIn: result.resetIn,
      days: result.resetIn > 0 ? Math.ceil(result.resetIn / 86400) : 0,
    })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
