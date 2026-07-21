import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, readAnthropicMetadata, startAiUsage } from '../../../lib/ai/usage'
import { guardInvitedClient } from '../../../lib/api-guard'
import { buildOverloadInvocation } from '../../../lib/ai/prompts'
import { parseAndValidateAiOutput } from '../../../lib/ai/parsing'
import { overloadSuggestionOutputSchema } from '../../../lib/ai/schemas'

function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for suggest-overload')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

export async function POST(req: NextRequest) {
  // ── Auth check ──
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

  // ── Rate limit ──
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`overload:${ip}`, 10, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  const usage = await startAiUsage({ client: supabaseAuth, feature: 'suggest-overload', principal: { kind: 'user', id: user.id }, correlationId: aiUsageCorrelationId(req), logicalModel: 'claude-haiku-4-5-20251001' })
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })
  let outcome: 'succeeded' | 'failed' = 'failed'
  let providerModel: string | undefined
  let tokens: { inputTokens?: number; outputTokens?: number } | undefined

  try {
    const body = await req.json()
    const { exerciseName, currentWeight, currentReps, setsCompleted, setsTarget, sessionId } = body
    const userId = user.id

    // ── Gate: invited clients cannot use AI ──
    const blocked = await guardInvitedClient(userId)
    if (blocked) return blocked

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    // ── Input validation ──
    if (!exerciseName || typeof exerciseName !== 'string' || exerciseName.length > 200) {
      return NextResponse.json({ error: 'exerciseName invalide' }, { status: 400 })
    }
    if (!currentWeight || currentWeight <= 0 || !currentReps || currentReps <= 0) {
      return NextResponse.json({ error: 'currentWeight et currentReps doivent être > 0' }, { status: 400 })
    }
    if (setsCompleted < setsTarget) {
      return NextResponse.json({ error: 'Toutes les séries doivent être réussies', skipped: true }, { status: 200 })
    }

    const supabase = getServiceSupabase()

    // ── Check for existing pending suggestion ──
    const { data: existing } = await supabase
      .from('progressive_overload_suggestions')
      .select('id')
      .eq('user_id', userId)
      .eq('exercise_name', exerciseName)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ skipped: true, reason: 'already_pending' })
    }

    // ── Fetch last 4 sessions history for this exercise ──
    const { data: history } = await supabase
      .from('workout_sets')
      .select('weight, reps, completed, set_number, session_id, created_at')
      .eq('user_id', userId)
      .eq('exercise_name', exerciseName)
      .order('created_at', { ascending: false })
      .limit(40)

    // Format history for the prompt
    const sessionGroups: Record<string, { date: string; sets: { weight: number; reps: number; completed: boolean }[] }> = {}
    for (const s of (history || [])) {
      const date = s.created_at.split('T')[0]
      const key = s.session_id || date
      if (!sessionGroups[key]) sessionGroups[key] = { date, sets: [] }
      sessionGroups[key].sets.push({ weight: s.weight, reps: s.reps, completed: s.completed !== false })
    }
    const historyLines = Object.values(sessionGroups)
      .slice(0, 4)
      .map(g => {
        const total = g.sets.length
        const completed = g.sets.filter(s => s.completed).length
        const weights = [...new Set(g.sets.map(s => s.weight))]
        const reps = [...new Set(g.sets.map(s => s.reps))]
        return `${g.date} : ${total}x${reps.join('/')}@${weights.join('/')}kg (${completed}/${total} réussies)`
      })
      .join('\n')

    const invocation = buildOverloadInvocation({ exerciseName, currentWeight, currentReps, setsCompleted, historyLines })
    // ── Call Claude API ──
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(invocation),
    })

    if (!res.ok) {
      console.error('[suggest-overload] Claude API error:', res.status)
      return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
    }

    const data = await res.json()
    ;({ providerModel, tokens } = readAnthropicMetadata(data))
    const text = data.content?.[0]?.text || ''

    const parsed = parseAndValidateAiOutput(text, overloadSuggestionOutputSchema, { allowMarkdownFence: true, allowLegacySurroundingText: true })
    if (!parsed.ok) {
      const error = parsed.error.reason === 'invalid_json' ? 'JSON parse échoué'
        : parsed.error.reason === 'invalid_shape' ? 'Suggestion invalide'
          : 'Format IA invalide'
      return NextResponse.json({ error }, { status: 500 })
    }
    const suggestion = parsed.value

    // ── Insert suggestion in DB ──
    const { error: insertError } = await supabase
      .from('progressive_overload_suggestions')
      .insert({
        user_id: userId,
        exercise_name: exerciseName,
        current_weight: currentWeight,
        current_reps: currentReps,
        suggested_weight: suggestion.weight,
        suggested_reps: suggestion.reps || currentReps,
        reasoning: suggestion.reasoning || '',
        status: 'pending',
        session_id_origin: sessionId || null,
      })

    if (insertError) {
      console.error('[suggest-overload] Insert error:', insertError)
      return NextResponse.json({
        skipped: true,
        reason: insertError.code === '23505' ? 'already_pending' : 'insert_failed',
        debug: {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        }
      })
    }

    outcome = 'succeeded'
    return NextResponse.json({
      ok: true,
      suggestion: {
        exerciseName,
        currentWeight,
        suggestedWeight: suggestion.weight,
        suggestedReps: suggestion.reps || currentReps,
        reasoning: suggestion.reasoning,
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[suggest-overload] Exception:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode: outcome === 'succeeded' ? 'completed' : 'request_failed', providerModel, tokens })
  }
}
