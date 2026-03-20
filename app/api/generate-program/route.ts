import { NextRequest, NextResponse } from 'next/server'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export async function POST(req: NextRequest) {
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

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    console.error('[generate-program] Anthropic error:', err)
    return NextResponse.json({ error: 'Erreur API Anthropic' }, { status: anthropicRes.status })
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
