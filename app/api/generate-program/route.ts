import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export async function POST(req: NextRequest) {
  console.log('API KEY exists:', !!process.env.ANTHROPIC_API_KEY)
  console.log('API KEY first 10 chars:', process.env.ANTHROPIC_API_KEY?.slice(0, 10))

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[generate-program] ANTHROPIC_API_KEY is not defined')
    return NextResponse.json({ error: 'Configuration serveur manquante: ANTHROPIC_API_KEY' }, { status: 500 })
  }

  const { objective, weight, targetWeight, level, equipment, trainingDays } = await req.json()

  const prompt = `Tu es un coach fitness expert. Génère un programme d'entraînement hebdomadaire pour ce client:
- Objectif: ${objective}
- Poids: ${weight}kg, Objectif: ${targetWeight}kg
- Niveau: ${level}
- Équipement: ${equipment.join(', ')}
- Jours d'entraînement: ${trainingDays} jours/semaine

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "lundi": { "isRest": false, "exercises": [{"name": "Nom", "sets": 3, "reps": 10, "rest": "60s", "notes": ""}] },
  "mardi": { "isRest": true, "exercises": [] },
  "mercredi": { "isRest": false, "exercises": [] },
  "jeudi": { "isRest": true, "exercises": [] },
  "vendredi": { "isRest": false, "exercises": [] },
  "samedi": { "isRest": true, "exercises": [] },
  "dimanche": { "isRest": true, "exercises": [] }
}
Les jours de repos ont isRest: true et exercises: [].`

  console.log('[generate-program] Calling Anthropic API...')
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  console.log('[generate-program] Anthropic API responded — status:', anthropicRes.status)

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    console.error(`[generate-program] Anthropic API error — status: ${anthropicRes.status}, body: ${err}`)
    return NextResponse.json({ error: `Erreur API Anthropic (${anthropicRes.status})`, detail: err }, { status: anthropicRes.status })
  }

  const data = await anthropicRes.json()
  const text: string = data.content?.[0]?.text ?? ''

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[generate-program] Could not parse JSON from:', text)
    return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 })
  }

  let aiProgram: Record<string, { isRest: boolean; exercises: unknown[] }>
  try {
    aiProgram = JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error('[generate-program] JSON parse error:', e)
    return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 })
  }

  // Normalise: ensure all 7 days are present
  for (const d of DAYS) {
    if (!aiProgram[d]) aiProgram[d] = { isRest: true, exercises: [] }
  }

  return NextResponse.json({ program: aiProgram })
}
