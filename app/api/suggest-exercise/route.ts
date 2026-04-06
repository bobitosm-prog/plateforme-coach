import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`suggest:${ip}`, 10, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { exerciseName, reason, muscleGroup, availableEquipment } = await req.json()
    if (!exerciseName) return NextResponse.json({ error: 'exerciseName requis' }, { status: 400 })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Tu es un coach fitness professionnel certifié. Ne mentionne jamais l'IA. L'utilisateur veut remplacer l'exercice "${exerciseName}" (muscle: ${muscleGroup || 'non spécifié'}).
Raison : ${reason || 'non spécifiée'}
${availableEquipment ? `Matériel disponible : ${availableEquipment}` : ''}

Propose exactement 3 alternatives en français. Pour chaque alternative, donne :
- nom de l'exercice
- muscles ciblés
- pourquoi c'est un bon remplacement
- niveau de difficulté (débutant/intermédiaire/avancé)

Réponds UNIQUEMENT en JSON valide :
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
