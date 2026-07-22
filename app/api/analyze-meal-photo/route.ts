import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, aiRateLimitResponse } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, startAiUsage } from '../../../lib/ai/usage'
import { buildMealPhotoInvocation } from '../../../lib/ai/prompts'
import { resolveAiModel } from '../../../lib/ai/models'
import { abortSignalToAiCancellation, createAnthropicProvider, promptInvocationToJsonRequest } from '../../../lib/ai/providers/anthropic'
import { createAiOutputValidator, mealPhotoOutputSchema } from '../../../lib/ai/schemas'
import { getAnthropicMessagesUrl } from '../../../lib/anthropic/chat-transport'

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
  const correlationId = aiUsageCorrelationId(req)
  const model = resolveAiModel('anthropic-sonnet-4.6')
  if (!model.ok || model.model.status !== 'active') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  const usage = await startAiUsage({ client: supabase, feature: 'analyze-meal-photo', principal: { kind: 'user', id: user.id }, correlationId, logicalModel: model.model.logicalId })
  if (usage.status === 'denied') return aiRateLimitResponse(15, Math.ceil(usage.retryAfterMs / 1000))
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })

  let outcome: 'succeeded' | 'failed' | 'cancelled' = 'failed'
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

    const invocation = buildMealPhotoInvocation(base64Data)
    const provider = createAnthropicProvider({ apiKey, messagesUrl: getAnthropicMessagesUrl() })
    const generated = await provider.generate(promptInvocationToJsonRequest(
      invocation,
      model.model.providerModelId,
      createAiOutputValidator(mealPhotoOutputSchema),
    ), {
      correlationId,
      timeoutMs: 300_000,
      cancellation: abortSignalToAiCancellation(req.signal),
    })
    providerModel = generated.metadata.actualModel
    tokens = generated.metadata.usage
    if (!generated.ok) {
      if (generated.error.code === 'cancelled') {
        outcome = 'cancelled'
        reasonCode = 'request_cancelled'
      }
      if (generated.error.code === 'invalid_output') {
        return NextResponse.json({ error: 'Reponse IA invalide' }, { status: 500 })
      }
      return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
    }
    outcome = 'succeeded'
    reasonCode = 'completed'
    return NextResponse.json(generated.value)
  } catch {
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode, providerModel, tokens })
  }
}
