import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, aiRateLimitResponse } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, startAiUsage } from '../../../lib/ai/usage'
import { buildExerciseSwapInvocation } from '../../../lib/ai/prompts'
import { resolveAiModel } from '../../../lib/ai/models'
import { abortSignalToAiCancellation, createAnthropicProvider, promptInvocationToJsonRequest } from '../../../lib/ai/providers/anthropic'
import { createAiOutputValidator, exerciseSuggestionsOutputSchema } from '../../../lib/ai/schemas'
import { getAnthropicMessagesUrl } from '../../../lib/anthropic/chat-transport'

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
  const correlationId = aiUsageCorrelationId(req)
  const model = resolveAiModel('anthropic-haiku-4.5')
  if (!model.ok || model.model.status !== 'active') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  const usage = await startAiUsage({ client: supabaseAuth, feature: 'suggest-exercise', principal: { kind: 'user', id: user.id }, correlationId, logicalModel: model.model.logicalId })
  if (usage.status === 'denied') return aiRateLimitResponse(20, Math.ceil(usage.retryAfterMs / 1000))
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })
  let outcome: 'succeeded' | 'failed' | 'cancelled' = 'failed'
  let providerModel: string | undefined
  let tokens: { inputTokens?: number; outputTokens?: number } | undefined

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

    const provider = createAnthropicProvider({ apiKey, messagesUrl: getAnthropicMessagesUrl() })
    const generated = await provider.generate(promptInvocationToJsonRequest(invocation, model.model.providerModelId, createAiOutputValidator(exerciseSuggestionsOutputSchema)), {
      correlationId, timeoutMs: 300_000, cancellation: abortSignalToAiCancellation(req.signal),
    })
    if (!generated.ok) {
      if (generated.error.code === 'cancelled') outcome = 'cancelled'
      if (generated.error.code === 'invalid_output') return NextResponse.json({ error: 'Format invalide' }, { status: 500 })
      const status = generated.error.code === 'quota_exceeded' ? 429 : 500
      return NextResponse.json({ error: status === 429 ? 'Erreur serveur (429)' : 'Erreur inattendue' }, { status })
    }
    providerModel = generated.metadata.actualModel
    tokens = generated.metadata.usage
    outcome = 'succeeded'
    return NextResponse.json({ suggestions: generated.value })
  } catch {
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode: outcome === 'succeeded' ? 'completed' : 'request_failed', providerModel, tokens })
  }
}
