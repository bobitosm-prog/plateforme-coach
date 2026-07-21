import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, readAnthropicMetadata, startAiUsage } from '../../../lib/ai/usage'
import { buildAdaptWorkoutInvocation } from '../../../lib/ai/prompts'
import { parseAndValidateAiOutput } from '../../../lib/ai/parsing'
import { adaptedWorkoutOutputSchema } from '../../../lib/ai/schemas'

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

  const usage = await startAiUsage({ client: supabase, feature: 'adapt-workout', principal: { kind: 'user', id: user.id }, correlationId: aiUsageCorrelationId(req), logicalModel: 'claude-sonnet-4-6' })
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })
  let outcome: 'succeeded' | 'failed' = 'failed'
  let providerModel: string | undefined
  let tokens: { inputTokens?: number; outputTokens?: number } | undefined

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { exercises, availableMinutes, sessionType } = await req.json()

    const invocation = buildAdaptWorkoutInvocation({ exercises, availableMinutes, sessionType })
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(invocation)
    })

    const data = await res.json()
    ;({ providerModel, tokens } = readAnthropicMetadata(data))
    const text = data.content?.[0]?.text || ''
    const parsed = parseAndValidateAiOutput(text, adaptedWorkoutOutputSchema, { allowMarkdownFence: true, allowLegacySurroundingText: true })
    if (!parsed.ok) return NextResponse.json({ error: 'Format invalide' }, { status: 500 })
    outcome = 'succeeded'
    return NextResponse.json({ exercises: parsed.value })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode: outcome === 'succeeded' ? 'completed' : 'request_failed', providerModel, tokens })
  }
}
