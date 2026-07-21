import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, startAiUsage } from '../../../lib/ai/usage'
import { buildExerciseInstructionsInvocation } from '../../../lib/ai/prompts'
import { parseAndValidateAiOutput } from '../../../lib/ai/parsing'
import { exerciseInstructionsOutputSchema } from '../../../lib/ai/schemas'

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

  const usage = await startAiUsage({ client: supabaseAuth, feature: 'generate-exercise-instructions', principal: { kind: 'user', id: user.id }, correlationId: aiUsageCorrelationId(req), logicalModel: 'claude-haiku-4-5-20251001' })
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })

  if (!process.env.ANTHROPIC_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await usage.tracker.finalize({ outcome: 'failed', reasonCode: 'provider_not_configured' })
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY or SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
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
  let hasTokenUsage = false
  let providerModel: string | undefined
  for (const ex of exercises) {
    try {
      const invocation = buildExerciseInstructionsInvocation({ name: ex.name, muscleGroup: ex.muscle_group, equipment: ex.equipment })
      const res = await anthropic.messages.create({
        model: invocation.model,
        max_tokens: invocation.max_tokens,
        messages: invocation.messages.map(message => ({ role: message.role, content: message.content as string })),
      })
      providerModel = res.model
      if (Number.isSafeInteger(res.usage.input_tokens) && Number.isSafeInteger(res.usage.output_tokens)) {
        inputTokens += res.usage.input_tokens
        outputTokens += res.usage.output_tokens
        hasTokenUsage = true
      }

      const text = res.content[0].type === 'text' ? res.content[0].text : ''
      const parsed = parseAndValidateAiOutput(text, exerciseInstructionsOutputSchema, { allowMarkdownFence: true })
      if (!parsed.ok) continue
      await supabase.from('exercises_db').update({
        instructions: parsed.value.instructions,
        tips: parsed.value.tips,
      }).eq('id', ex.id)
      processed++
    } catch (e: any) {
      console.error('[generate-instructions] Failed for', ex.name, e.message)
    }
  }

  await usage.tracker.finalize({
    outcome: processed > 0 ? 'succeeded' : 'failed', reasonCode: processed > 0 ? 'completed' : 'provider_error', providerModel,
    tokens: hasTokenUsage ? { inputTokens, outputTokens } : undefined,
  })
  return NextResponse.json({ done: false, processed, remaining: exercises.length - processed })
}
