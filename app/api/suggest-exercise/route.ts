import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, checkAiRateLimit, aiRateLimitResponse, logAiUsage } from '../../../lib/rate-limit'
import { buildExerciseSwapInvocation } from '../../../lib/ai/prompts'
import { parseAndValidateAiOutput } from '../../../lib/ai/parsing'
import { exerciseSuggestionsOutputSchema } from '../../../lib/ai/schemas'

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

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`suggest:${ip}`, 10, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  // DB-backed hourly rate limit
  const aiRl = await checkAiRateLimit(supabaseAuth, user.id, 'suggest-exercise')
  if (!aiRl.allowed) return aiRateLimitResponse(aiRl.limit, aiRl.resetIn)
  await logAiUsage(supabaseAuth, user.id, 'suggest-exercise')

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const body = await req.json()
    const { exerciseName, reason, muscleGroup, availableEquipment, isIsolation } = body
    const userId = user.id

    // Guard: invited clients cannot use AI suggestions
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { guardInvitedClient } = await import('../../../lib/api-guard')
      const blocked = await guardInvitedClient(userId)
      if (blocked) return blocked
    }
    if (!exerciseName) return NextResponse.json({ error: 'exerciseName requis' }, { status: 400 })

    const invocation = buildExerciseSwapInvocation({ exerciseName, reason, muscleGroup, availableEquipment, isIsolation })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(invocation)
    })

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const parsed = parseAndValidateAiOutput(text, exerciseSuggestionsOutputSchema, { allowMarkdownFence: true, allowLegacySurroundingText: true })
    if (!parsed.ok) return NextResponse.json({ error: 'Format invalide' }, { status: 500 })
    return NextResponse.json({ suggestions: parsed.value })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
