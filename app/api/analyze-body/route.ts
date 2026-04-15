import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`body:${ip}`, 2, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { photoFrontUrl, photoBackUrl, photoSideUrl, weight, height } = await req.json()
    if (!photoFrontUrl || !photoBackUrl || !photoSideUrl) {
      return NextResponse.json({ error: '3 photos requises (face, dos, profil)' }, { status: 400 })
    }

    const fetchImage = async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = await res.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mediaType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
      return { base64, mediaType }
    }

    const [front, back, side] = await Promise.all([
      fetchImage(photoFrontUrl),
      fetchImage(photoBackUrl),
      fetchImage(photoSideUrl),
    ])

    const systemPrompt = `Tu es un expert en analyse corporelle fitness. Analyse ces 3 photos (face, dos, profil) et retourne UNIQUEMENT un JSON valide (sans markdown, sans backticks) avec cette structure exacte :
{
  "body_fat_estimate": <number, pourcentage estimé de masse grasse>,
  "lean_mass_estimate": <number, kg de masse maigre estimée>,
  "strengths": [<2-3 strings, points forts physiques observés en français>],
  "improvements": [<2-3 strings, axes d'amélioration en français>],
  "symmetry_score": <number 0-100, score de symétrie gauche/droite>,
  "summary": "<résumé court en français, 2-3 phrases>"
}
Poids de l'utilisateur : ${weight || '?'} kg. Taille : ${height || '?'} cm.
IMPORTANT : Ce sont des ESTIMATIONS visuelles, pas des mesures exactes. Précise-le dans le summary.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: front.mediaType, data: front.base64 } },
            { type: 'image', source: { type: 'base64', media_type: back.mediaType, data: back.base64 } },
            { type: 'image', source: { type: 'base64', media_type: side.mediaType, data: side.base64 } },
            { type: 'text', text: systemPrompt },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[analyze-body] Claude error:', err)
      return NextResponse.json({ error: 'Erreur lors de l\'analyse' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Réponse invalide de l\'IA' }, { status: 500 })

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[analyze-body] Error:', e.message)
    return NextResponse.json({ error: e.message || 'Erreur interne' }, { status: 500 })
  }
}
