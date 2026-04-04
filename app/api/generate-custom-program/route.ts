import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { objective, level, daysPerWeek, duration, equipment, priorities, notes } = body

    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'API key manquante' }, { status: 500 })
    }

    const prompt = `Crée un programme d'entraînement en JSON.
Objectif: ${objective}, Niveau: ${level}, ${daysPerWeek} jours/semaine, ${duration}min/séance, Équipement: ${equipment}, Zones: ${(priorities || []).join(', ')}, Notes: ${notes || 'aucune'}.

Réponds UNIQUEMENT avec ce JSON valide, rien d'autre:
{"program_name":"string","description":"string","days":[{"day_number":1,"name":"string","focus":"string","exercises":[{"custom_name":"string","sets":3,"reps":10,"rest_seconds":90}]}]}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        temperature: 0,
        system: 'Tu es un coach fitness. Réponds UNIQUEMENT avec du JSON valide, aucun texte avant ou après.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const json = await res.json()
    const raw = json.content?.[0]?.text || ''

    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: 'JSON introuvable dans la réponse' }, { status: 500 })
    }

    let cleaned = raw.slice(start, end + 1)
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')

    const program = JSON.parse(cleaned)
    return NextResponse.json({ program })

  } catch (e: any) {
    console.error('[generate-custom-program] ERROR:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
