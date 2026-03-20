import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
    console.log('API KEY exists:', !!apiKey)
    console.log('API KEY first 10 chars:', apiKey?.slice(0, 10))

    if (!apiKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante: NEXT_PUBLIC_ANTHROPIC_API_KEY' }, { status: 500 })
    }

    const { objective, weight, targetWeight, level, equipment, trainingDays } = await req.json()

    const prompt = `Tu es un coach fitness. Génère un programme d'entraînement en JSON UNIQUEMENT.

Client: objectif=${objective}, poids=${weight}kg, cible=${targetWeight}kg, niveau=${level}, équipement=${equipment.join(',')}, ${trainingDays} jours/semaine

Réponds avec SEULEMENT ce JSON (pas de texte avant ou après):
{
  "lundi": {"isRest": false, "exercises": [{"name": "Squat", "sets": 3, "reps": 10, "rest": "60s", "notes": ""}]},
  "mardi": {"isRest": true, "exercises": []},
  "mercredi": {"isRest": false, "exercises": [{"name": "Développé couché", "sets": 3, "reps": 8, "rest": "90s", "notes": ""}]},
  "jeudi": {"isRest": true, "exercises": []},
  "vendredi": {"isRest": false, "exercises": [{"name": "Tractions", "sets": 3, "reps": 8, "rest": "90s", "notes": ""}]},
  "samedi": {"isRest": true, "exercises": []},
  "dimanche": {"isRest": true, "exercises": []}
}

Génère ${trainingDays} jours d'entraînement et ${7 - trainingDays} jours de repos. Maximum 4 exercices par jour.`

    console.log('[generate-program] Calling Anthropic API...')
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
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
    const rawText = data.content[0].text
    console.log('[generate-program] Raw AI response:', rawText)

    // Extract JSON from response (Claude sometimes adds text before/after)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response: ' + rawText.slice(0, 200))

    const parsed = JSON.parse(jsonMatch[0])
    const aiProgram: Record<string, { isRest: boolean; exercises: unknown[] }> = parsed

    // Normalise: ensure all 7 days are present
    for (const d of DAYS) {
      if (!aiProgram[d]) aiProgram[d] = { isRest: true, exercises: [] }
    }

    return NextResponse.json({ program: aiProgram })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[generate-program] Unhandled error:', message)
    return NextResponse.json({ error: 'Erreur inattendue', detail: message }, { status: 500 })
  }
}
