import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, startAiUsage } from '../../../lib/ai/usage'
import { buildAdaptWorkoutInvocation } from '../../../lib/ai/prompts'
import { resolveAiModel } from '../../../lib/ai/models'
import { abortSignalToAiCancellation, createAnthropicProvider, promptInvocationToJsonRequest } from '../../../lib/ai/providers/anthropic'
import { adaptedWorkoutOutputSchema, createAiOutputValidator } from '../../../lib/ai/schemas'
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
  const rl = checkRateLimit(`adapt:${ip}`, 5, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  const correlationId = aiUsageCorrelationId(req)
  const model = resolveAiModel('anthropic-sonnet-4.6')
  if (!model.ok || model.model.status !== 'active') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  const usage = await startAiUsage({ client: supabase, feature: 'adapt-workout', principal: { kind: 'user', id: user.id }, correlationId, logicalModel: model.model.logicalId })
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })
  let outcome: 'succeeded' | 'failed' | 'cancelled' = 'failed'
  let providerModel: string | undefined
  let tokens: { inputTokens?: number; outputTokens?: number } | undefined

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { exercises, availableMinutes, sessionType } = await req.json()

    const invocation = buildAdaptWorkoutInvocation({ exercises, availableMinutes, sessionType })
    const provider = createAnthropicProvider({ apiKey, messagesUrl: getAnthropicMessagesUrl() })
    const generated = await provider.generate(promptInvocationToJsonRequest(
      invocation,
      model.model.providerModelId,
      createAiOutputValidator(adaptedWorkoutOutputSchema),
    ), {
      correlationId,
      timeoutMs: 300_000,
      cancellation: abortSignalToAiCancellation(req.signal),
    })
    providerModel = generated.metadata.actualModel
    tokens = generated.metadata.usage
    if (!generated.ok) {
      if (generated.error.code === 'cancelled') outcome = 'cancelled'
      if (generated.error.code === 'invalid_output') return NextResponse.json({ error: 'Format invalide' }, { status: 500 })
      return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 })
    }
    outcome = 'succeeded'
    return NextResponse.json({ exercises: generated.value })
  } catch {
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode: outcome === 'succeeded' ? 'completed' : outcome === 'cancelled' ? 'request_cancelled' : 'request_failed', providerModel, tokens })
  }
}
