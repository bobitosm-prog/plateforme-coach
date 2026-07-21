import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, aiRateLimitResponse } from '../../../lib/rate-limit'
import { aiUsageCorrelationId, readAnthropicMetadata, startAiUsage } from '../../../lib/ai/usage'
import { getChatAnthropicMessagesUrl } from '../../../lib/anthropic/chat-transport'
import { buildAthenaInvocation } from '../../../lib/ai/prompts'

type ChatProfile = {
  full_name?: string | null; current_weight?: number | null; target_weight?: number | null; height?: number | null
  gender?: string | null; tdee?: number | null; calorie_goal?: number | null; protein_goal?: number | null
  carbs_goal?: number | null; fat_goal?: number | null; fitness_level?: string | null; fitness_score?: number | null
  objective?: string | null; activity_level?: string | null; dietary_type?: string | null; onboarding_answers?: unknown
}

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
  const rl = checkRateLimit(`chat:${ip}`, 15, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  // DB-backed hourly rate limit per user
  const usage = await startAiUsage({ client: supabase, feature: 'chat-ai', principal: { kind: 'user', id: user.id }, correlationId: aiUsageCorrelationId(req), logicalModel: 'claude-sonnet-4-6' })
  if (usage.status === 'denied') return aiRateLimitResponse(20, Math.ceil(usage.retryAfterMs / 1000))
  if (usage.status !== 'started') return NextResponse.json({ error: 'Service temporairement indisponible' }, { status: usage.status === 'conflict' ? 409 : 503 })
  let outcome: 'succeeded' | 'failed' = 'failed'
  let providerModel: string | undefined
  let tokens: { inputTokens?: number; outputTokens?: number } | undefined

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { message } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

    // Fetch profile from DB (no longer sent by client)
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, current_weight, target_weight, height, gender, tdee, calorie_goal, protein_goal, carbs_goal, fat_goal, fitness_level, fitness_score, objective, activity_level, dietary_type, onboarding_answers, subscription_type')
      .eq('id', user.id)
      .single()

    // Guard: invited clients cannot use AI coach
    if (profile?.subscription_type === 'invited') {
      return NextResponse.json({ error: 'Cette fonctionnalité est gérée par ton coach. Contacte-le directement.' }, { status: 403 })
    }

    const p: ChatProfile = profile || {}

    // Fetch last 10 messages from DB for Anthropic context
    const { data: dbHistory } = await supabase
      .from('chat_ai_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const historyMessages = (dbHistory || []).reverse().map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: m.content,
    }))

    // INSERT user message BEFORE calling Anthropic
    const trimmedMessage = message.trim().slice(0, 500)
    const { error: insertUserErr } = await supabase
      .from('chat_ai_messages')
      .insert({ user_id: user.id, role: 'user', content: trimmedMessage })

    if (insertUserErr) {
      console.error('[chat-ai] insert user message failed:', insertUserErr)
      return NextResponse.json({ error: 'Erreur sauvegarde message' }, { status: 500 })
    }

    // Build messages for Anthropic
    const invocation = buildAthenaInvocation(p, historyMessages, trimmedMessage)

    const res = await fetch(getChatAnthropicMessagesUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(invocation),
    })

    if (!res.ok) {
      console.error('[chat-ai] Anthropic error:', res.status)
      return NextResponse.json({ error: `Erreur serveur (${res.status})` }, { status: res.status })
    }

    const data = await res.json()
    ;({ providerModel, tokens } = readAnthropicMetadata(data))
    const aiMessage = data.content?.[0]?.text || 'Désolé, je n\'ai pas pu répondre.'

    // INSERT assistant response AFTER reception (best effort)
    const { error: insertAiErr } = await supabase
      .from('chat_ai_messages')
      .insert({ user_id: user.id, role: 'assistant', content: aiMessage })

    if (insertAiErr) {
      console.error('[chat-ai] insert assistant message failed:', insertAiErr)
      // Don't fail the request — user still gets the response
    }

    outcome = 'succeeded'
    return NextResponse.json({ message: aiMessage })
  } catch (e: unknown) {
    console.error('[chat-ai] unexpected error:', e)
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 })
  } finally {
    await usage.tracker.finalize({ outcome, reasonCode: outcome === 'succeeded' ? 'completed' : 'request_failed', providerModel, tokens })
  }
}
