import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, startAiUsage } from '../../../lib/ai/usage'
import { buildExerciseInstructionsInvocation } from '../../../lib/ai/prompts'
import { resolveAiModel } from '../../../lib/ai/models'
import { abortSignalToAiCancellation, createAnthropicProvider, promptInvocationToJsonRequest } from '../../../lib/ai/providers/anthropic'
import { createAiOutputValidator, exerciseInstructionsOutputSchema } from '../../../lib/ai/schemas'
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

  // Admin-only gate
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`exinstr:${ip}`, 2, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  const correlationId = aiUsageCorrelationId(req)
  const model = resolveAiModel('anthropic-haiku-4.5')
  if (!model.ok || model.model.status !== 'active') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: 503 })
  const usage = await startAiUsage({ client: supabaseAuth, feature: 'generate-exercise-instructions', principal: { kind: 'user', id: user.id }, correlationId, logicalModel: model.model.logicalId })
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })

  if (!process.env.ANTHROPIC_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await usage.tracker.finalize({ outcome: 'failed', reasonCode: 'provider_not_configured' })
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY or SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  const provider = createAnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY, messagesUrl: getAnthropicMessagesUrl() })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: exercises } = await supabase
    .from('exercises_db')
    .select('id, name, muscle_group, equipment')
    .is('instructions', null)
    .limit(20)

  if (!exercises?.length) {
    await usage.tracker.finalize({ outcome: 'cancelled', reasonCode: 'nothing_to_process' })
    return NextResponse.json({ done: true, count: 0 })
  }

  let processed = 0
  let inputTokens = 0
  let outputTokens = 0
  let hasInputTokens = false
  let hasOutputTokens = false
  let tokenUsageComplete = true
  let providerModel: string | undefined
  let providerCalls = 0
  let cancelled = false
  let invalidOutput = false
  for (const ex of exercises) {
    if (req.signal.aborted) {
      cancelled = true
      break
    }
    try {
      const invocation = buildExerciseInstructionsInvocation({ name: ex.name, muscleGroup: ex.muscle_group, equipment: ex.equipment })
      providerCalls++
      const generated = await provider.generate(promptInvocationToJsonRequest(
        invocation,
        model.model.providerModelId,
        createAiOutputValidator(exerciseInstructionsOutputSchema),
      ), {
        correlationId,
        timeoutMs: 300_000,
        cancellation: abortSignalToAiCancellation(req.signal),
      })
      providerModel = generated.metadata.actualModel ?? providerModel
      const callInputTokens = generated.metadata.usage?.inputTokens
      const callOutputTokens = generated.metadata.usage?.outputTokens
      if (Number.isSafeInteger(callInputTokens)) {
        inputTokens += callInputTokens ?? 0
        hasInputTokens = true
      } else {
        tokenUsageComplete = false
      }
      if (Number.isSafeInteger(callOutputTokens)) {
        outputTokens += callOutputTokens ?? 0
        hasOutputTokens = true
      } else {
        tokenUsageComplete = false
      }
      if (!generated.ok) {
        if (generated.error.code === 'cancelled') {
          cancelled = true
          break
        }
        if (generated.error.code === 'invalid_output') invalidOutput = true
        continue
      }
      await supabase.from('exercises_db').update({
        instructions: generated.value.instructions,
        tips: generated.value.tips,
      }).eq('id', ex.id)
      processed++
    } catch {
      tokenUsageComplete = false
    }
  }

  const tokens = hasInputTokens || hasOutputTokens
    ? { inputTokens: hasInputTokens ? inputTokens : undefined, outputTokens: hasOutputTokens ? outputTokens : undefined }
    : undefined
  const tokenCompleteness = tokens === undefined ? 'unavailable' as const
    : tokenUsageComplete && hasInputTokens && hasOutputTokens ? 'complete' as const : 'partial' as const
  const partial = processed > 0 && processed < exercises.length
  const outcome = cancelled ? 'cancelled' as const : processed > 0 ? 'succeeded' as const : 'failed' as const
  const reasonCode = cancelled ? 'request_cancelled'
    : partial ? 'partial_completed'
      : processed > 0 ? 'completed'
        : invalidOutput ? 'invalid_output' : 'provider_error'
  await usage.tracker.finalize({
    outcome, reasonCode, providerModel, tokens, tokenCompleteness,
    attemptCount: providerCalls,
  })
  return NextResponse.json({ done: false, processed, remaining: exercises.length - processed })
}
