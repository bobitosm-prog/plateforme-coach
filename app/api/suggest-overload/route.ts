import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'
import { guardInvitedClient } from '../../../lib/api-guard'

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

    // ── Call Claude API ──
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        temperature: 0.3,
        system: `Tu es un coach fitness expert en progressive overload.
Tu réponds UNIQUEMENT en JSON valide, aucun texte avant ou après.
Format strict : {"weight": number, "reps": number, "reasoning": string}`,
        messages: [{
          role: 'user',
          content: `Le client vient de finir ${setsCompleted}x${currentReps}@${currentWeight}kg sur l'exercice '${exerciseName}', toutes séries réussies.

Historique des dernières séances (récent → ancien) :
${historyLines || 'Aucun historique disponible (première séance)'}

Règles de progression :
- Exos composés lourds (squat, bench press, deadlift, overhead press, row) : +2.5 à +5kg
- Exos isolation moyens (leg curl, leg extension, lat pulldown) : +2.5kg
- Exos petits muscles isolation (curl biceps, lateral raise, tricep extension, face pull) : +1.25 à +2.5kg
- Si l'historique montre une stagnation (3+ séances même poids réussies) : pousser plus haut (+5kg composé, +2.5kg isolation)
- Si la progression est récente (1 séance réussie seulement) : prudent (+2.5kg max composé, +1.25kg isolation)
- Garder le même nombre de reps cibles

Suggère la prochaine charge. Reasoning concis (max 100 chars), français, ton motivant.`,
        }],
      }),
    })

    if (!res.ok) {
      console.error('[suggest-overload] Claude API error:', res.status, await res.text())
      return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || ''

    // ── Parse JSON response ──
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[suggest-overload] Invalid JSON from Claude:', text)
      return NextResponse.json({ error: 'Format IA invalide' }, { status: 500 })
    }

    let suggestion: { weight: number; reps: number; reasoning: string }
    try {
      suggestion = JSON.parse(jsonMatch[0])
    } catch {
      console.error('[suggest-overload] JSON parse failed:', jsonMatch[0])
      return NextResponse.json({ error: 'JSON parse échoué' }, { status: 500 })
    }

    if (!suggestion.weight || suggestion.weight <= 0) {
      return NextResponse.json({ error: 'Suggestion invalide' }, { status: 500 })
    }

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
  }
}
