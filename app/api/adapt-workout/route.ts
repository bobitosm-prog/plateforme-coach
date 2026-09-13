import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  aiRateLimitResponse,
  checkAiRateLimit,
  checkRateLimit,
  logAiUsage,
} from '../../../lib/rate-limit'
import { guardCoachManagedCapabilities } from '../../../lib/api-guard'
import {
  generateSessionAdaptation,
  sessionAdaptationRequestSchema,
  SessionAdaptationError,
} from '../../../lib/athena/session-adaptation'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rateLimit = checkRateLimit(`adapt:${ip}`, 5, 60_000)
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  const parsedRequest = sessionAdaptationRequestSchema.safeParse(await req.json().catch(() => null))
  if (!parsedRequest.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })

  const blocked = await guardCoachManagedCapabilities(user.id)
  if (blocked) return blocked
  const aiRateLimit = await checkAiRateLimit(supabase, user.id, 'adapt-workout')
  if (!aiRateLimit.allowed) return aiRateLimitResponse(aiRateLimit.limit, aiRateLimit.resetIn)

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 500 })

  try {
    const exercises = await generateSessionAdaptation(parsedRequest.data, apiKey)
    await logAiUsage(supabase, user.id, 'adapt-workout')
    return NextResponse.json({ exercises })
  } catch (error: unknown) {
    if (error instanceof SessionAdaptationError && error.code === 'invalid_model_output') {
      return NextResponse.json({ error: 'Adaptation invalide' }, { status: 502 })
    }
    console.error('[adapt-workout] generation failed')
    return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 502 })
  }
}
