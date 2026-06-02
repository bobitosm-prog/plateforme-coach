import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'
import { unwrapToolInput } from '../../../lib/anthropic/unwrap-tool-input'

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
  const rl = checkRateLimit(`body:${ip}`, 5, 60000)
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

    // System prompt unique (structure définie par le tool schema, pas dans le texte)
    const systemPrompt = `Tu es un expert en analyse corporelle fitness. Tu analyses 3 photos (face, dos, profil) pour estimer la composition corporelle visuellement. Tes estimations sont visuelles et non médicales.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        system: systemPrompt,
        tool_choice: { type: 'tool', name: 'body_analysis_output' },
        tools: [{
          name: 'body_analysis_output',
          description: 'Structure l\'analyse corporelle en JSON exploitable',
          input_schema: {
            type: 'object',
            required: ['body_fat_estimate', 'lean_mass_estimate', 'strengths', 'improvements', 'symmetry_score', 'summary'],
            properties: {
              body_fat_estimate: { type: 'number', description: 'Taux de masse grasse estimé en pourcentage (ex: 18.5 pour 18.5%)' },
              lean_mass_estimate: { type: 'number', description: 'Masse maigre estimée en kg (ex: 65.2 pour 65.2 kg)' },
              strengths: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3, description: 'Points forts visibles (musculature développée, posture, etc.)' },
              improvements: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3, description: 'Axes d\'amélioration recommandés' },
              symmetry_score: { type: 'integer', minimum: 0, maximum: 100, description: 'Score de symétrie gauche/droite et haut/bas, 0=très asymétrique, 100=parfaitement symétrique' },
              summary: { type: 'string', description: 'Synthèse en 2-3 phrases du physique global et des recommandations principales' },
            },
          },
        }],
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: front.mediaType, data: front.base64 } },
            { type: 'image', source: { type: 'base64', media_type: back.mediaType, data: back.base64 } },
            { type: 'image', source: { type: 'base64', media_type: side.mediaType, data: side.base64 } },
            { type: 'text', text: `Données utilisateur : poids ${weight || '?'} kg, taille ${height || '?'} cm. Analyse les 3 photos (face, dos, profil) et appelle le tool body_analysis_output avec ton analyse.` },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[analyze-body] Claude API error:', response.status, err)
      return NextResponse.json({ error: `Erreur IA (${response.status}): ${err.slice(0, 200)}` }, { status: response.status })
    }

    const data = await response.json()
    const toolUseBlock = data.content?.find((c: any) => c.type === 'tool_use')
    if (!toolUseBlock) {
      console.error('[analyze-body] No tool_use in response:', JSON.stringify(data).slice(0, 500))
      return NextResponse.json({ error: 'Format IA invalide' }, { status: 500 })
    }

    const result = unwrapToolInput(toolUseBlock.input)
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[analyze-body] Error:', e.message)
    return NextResponse.json({ error: e.message || 'Erreur interne' }, { status: 500 })
  }
}
