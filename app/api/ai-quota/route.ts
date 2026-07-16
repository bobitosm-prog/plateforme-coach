import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createIdentityRepository } from '@/lib/repositories/identity'
import { checkRateLimit, checkAiQuota } from '../../../lib/rate-limit'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`ai-quota:${ip}`, 30, 60000)
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 })

  try {
    const supabase = await createSupabaseServerClient()
    const identity = await createIdentityRepository(supabase).getCurrent()
    if (!identity.ok) return NextResponse.json({ ok: false }, { status: 401 })

    const result = await checkAiQuota(supabase, identity.data.id)
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
