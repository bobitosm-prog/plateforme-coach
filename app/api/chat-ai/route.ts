import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, checkAiRateLimit, aiRateLimitResponse, logAiUsage } from '../../../lib/rate-limit'
import { COACH_SYSTEM_PROMPT } from '../../../lib/coach-knowledge'
import { getChatAnthropicMessagesUrl } from '../../../lib/anthropic/chat-transport'

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
  const aiRl = await checkAiRateLimit(supabase, user.id, 'chat-ai')
  if (!aiRl.allowed) return aiRateLimitResponse(aiRl.limit, aiRl.resetIn)

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
    const onboarding = p && 'onboarding_answers' in p && p.onboarding_answers && typeof p.onboarding_answers === 'object'
      ? p.onboarding_answers as Record<string, unknown>
      : {}
    const systemPrompt = `${COACH_SYSTEM_PROMPT}

PROFIL DU CLIENT :
- Nom : ${p.full_name || 'Client'}
- Poids : ${p.current_weight || '?'}kg → Objectif : ${p.target_weight || '?'}kg
- Taille : ${p.height || '?'}cm | Genre : ${p.gender || '?'}
- TDEE : ${p.tdee || '?'} kcal | Objectif calorique : ${p.calorie_goal || '?'} kcal/jour
- Macros : P${p.protein_goal || '?'}g / G${p.carbs_goal || '?'}g / L${p.fat_goal || '?'}g
- Niveau : ${p.fitness_level || '?'} (score ${p.fitness_score || '?'}/100)
- Objectif : ${p.objective || 'non defini'}
- Activite : ${p.activity_level || 'non defini'}
- Regime : ${p.dietary_type || 'omnivore'}
- Experience : ${onboarding.experience || 'non renseigne'}

REGLES : personnalise avec le profil, sois concis (max 200 mots), 1-2 emojis max, ne mentionne JAMAIS l'IA. Signe 'Ton coach MoovX'.
12. Tu connais le score de forme du client (0-100) — adapte l'intensité de tes conseils en conséquence
13. Si le client parle de douleur ou blessure → recommande d'en parler au coach humain via l'onglet Messages
14. Tu peux donner des conseils de récupération (sommeil, stress, hydratation)
15. Si le client demande à modifier son programme → dis-lui d'utiliser le bouton "Adapter la séance" dans l'onglet Entraînement
16. Termine chaque réponse par une question de suivi pour maintenir l'engagement`

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
    const messages = [
      ...historyMessages,
      { role: 'user' as const, content: trimmedMessage },
    ]

    const res = await fetch(getChatAnthropicMessagesUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[chat-ai] Anthropic error:', res.status, err)
      return NextResponse.json({ error: `Erreur serveur (${res.status})` }, { status: res.status })
    }

    const data = await res.json()
    const aiMessage = data.content?.[0]?.text || 'Désolé, je n\'ai pas pu répondre.'

    // INSERT assistant response AFTER reception (best effort)
    const { error: insertAiErr } = await supabase
      .from('chat_ai_messages')
      .insert({ user_id: user.id, role: 'assistant', content: aiMessage })

    if (insertAiErr) {
      console.error('[chat-ai] insert assistant message failed:', insertAiErr)
      // Don't fail the request — user still gets the response
    }

    await logAiUsage(supabase, user.id, 'chat-ai')
    return NextResponse.json({ message: aiMessage })
  } catch (e: unknown) {
    console.error('[chat-ai] unexpected error:', e)
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 })
  }
}
