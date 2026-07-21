import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, aiRateLimitResponse } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, readAnthropicMetadata, startAiUsage } from '../../../lib/ai/usage'
import { buildMealPhotoInvocation } from '../../../lib/ai/prompts'
import { parseAndValidateAiOutput } from '../../../lib/ai/parsing'
import { mealPhotoOutputSchema } from '../../../lib/ai/schemas'

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`meal-photo:${ip}`, 5, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes. Reessayez dans ' + rl.retryAfter + 's.' }, { status: 429 })

  // DB-backed hourly rate limit
  const usage = await startAiUsage({ client: supabase, feature: 'analyze-meal-photo', principal: { kind: 'user', id: user.id }, correlationId: aiUsageCorrelationId(req), logicalModel: 'claude-sonnet-4-6' })
  if (usage.status === 'denied') return aiRateLimitResponse(15, Math.ceil(usage.retryAfterMs / 1000))
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })

  let outcome: 'succeeded' | 'failed' = 'failed'
  let reasonCode = 'request_failed'
  let providerModel: string | undefined
  let tokens: { inputTokens?: number; outputTokens?: number } | undefined

  try {
    const { image } = await req.json()
    if (!image || typeof image !== 'string') return NextResponse.json({ error: 'Image requise' }, { status: 400 })

    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    // ~5 MB binaire = ~6.7M chars base64 (plafond API Anthropic)
    if (base64Data.length > 6_700_000) {
      return NextResponse.json({ error: 'Image trop volumineuse (max 5 MB)' }, { status: 413 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(buildMealPhotoInvocation(base64Data)),
    })

    if (!res.ok) {
      console.error('[analyze-meal-photo] Anthropic error:', res.status)
      return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
    }

    const data = await res.json()
    ;({ providerModel, tokens } = readAnthropicMetadata(data))
    const text = data.content?.[0]?.text || ''
    const parsed = parseAndValidateAiOutput(text, mealPhotoOutputSchema, { allowMarkdownFence: true, allowLegacySurroundingText: true })
    if (!parsed.ok) return NextResponse.json({ error: 'Reponse IA invalide' }, { status: 500 })
    outcome = 'succeeded'
    reasonCode = 'completed'
    return NextResponse.json(parsed.value)
  } catch (e: any) {
    console.error('[analyze-meal-photo] Error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode, providerModel, tokens })
  }
}
