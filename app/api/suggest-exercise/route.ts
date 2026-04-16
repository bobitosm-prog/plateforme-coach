import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'
import { EXERCISE_SWAP_PROMPT } from '../../../lib/coach-knowledge'

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

    const typeHint = isIsolation === true ? `IMPORTANT : "${exerciseName}" est un exercice d'ISOLATION. Propose UNIQUEMENT d'autres exercices d'isolation pour le meme groupe musculaire.`
      : isIsolation === false ? `IMPORTANT : "${exerciseName}" est un exercice COMPOSE. Propose UNIQUEMENT d'autres exercices composes.`
      : ''

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: EXERCISE_SWAP_PROMPT,
        messages: [{
          role: 'user',
          content: `L'utilisateur veut remplacer l'exercice "${exerciseName}" (muscle: ${muscleGroup || 'non specifie'}).
Raison : ${reason || 'non specifiee'}
${availableEquipment ? `Materiel disponible : ${availableEquipment}` : ''}
${typeHint}

Propose exactement 3 alternatives en francais. Pour chaque alternative, donne :
- nom de l'exercice
- muscles cibles
- pourquoi c'est un bon remplacement
- niveau de difficulte (debutant/intermediaire/avance)

Reponds UNIQUEMENT en JSON valide :
[{"name": "...", "muscles": "...", "reason": "...", "difficulty": "..."}]`
        }]
      })
    })

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ error: 'Format invalide' }, { status: 500 })
    const suggestions = JSON.parse(jsonMatch[0])
    return NextResponse.json({ suggestions })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
