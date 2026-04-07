import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../lib/rate-limit'
import { EXERCISE_SWAP_PROMPT } from '../../../lib/coach-knowledge'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`suggest:${ip}`, 10, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { exerciseName, reason, muscleGroup, availableEquipment, isIsolation } = await req.json()
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
