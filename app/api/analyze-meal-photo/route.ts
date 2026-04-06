import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`meal-photo:${ip}`, 5, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes. Reessayez dans ' + rl.retryAfter + 's.' }, { status: 429 })

  try {
    const { image } = await req.json()
    if (!image) return NextResponse.json({ error: 'Image requise' }, { status: 400 })

    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Data } },
            { type: 'text', text: `Analyse cette photo de repas. Identifie chaque aliment visible avec une estimation des quantites.

Reponds UNIQUEMENT en JSON valide, sans markdown :
{
  "foods": [
    { "name": "Nom en francais", "quantity_g": estimation, "calories": kcal, "proteins": g, "carbs": g, "fats": g }
  ],
  "total_calories": total,
  "confidence": "high" ou "medium" ou "low"
}` }
          ]
        }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[analyze-meal-photo] Anthropic error:', res.status, err.slice(0, 200))
      return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Reponse IA invalide' }, { status: 500 })

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (e: any) {
    console.error('[analyze-meal-photo] Error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
