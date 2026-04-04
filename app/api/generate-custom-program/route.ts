import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { objective, level, daysPerWeek, duration, equipment, priorities, notes, availableExercises } = await req.json()

    const systemPrompt = `Tu es un coach fitness expert en programmation sportive.
Tu crées des programmes d'entraînement structurés, progressifs et adaptés.
Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires.`

    const userPrompt = `Crée un programme d'entraînement pour ce client :
- Objectif : ${objective}
- Niveau : ${level}
- Jours/semaine : ${daysPerWeek}
- Durée par séance : ${duration} min
- Équipement : ${equipment}
- Zones prioritaires : ${(priorities || []).join(', ') || 'aucune'}
- Contraintes : ${notes || 'aucune'}

Utilise UNIQUEMENT des exercices de cette base quand possible :
${JSON.stringify((availableExercises || []).slice(0, 100).map((e: any) => ({ name: e.name, muscle_group: e.muscle_group })))}

Si un exercice nécessaire n'existe pas dans la base, utilise le champ "custom_name".

Réponds avec ce JSON exact :
{
  "program_name": "string",
  "description": "string court",
  "days": [
    {
      "day_number": 1,
      "name": "Push A",
      "focus": "Poitrine, Épaules, Triceps",
      "exercises": [
        {
          "exercise_name": "Nom exact de la base ou custom",
          "custom_name": null,
          "sets": 4,
          "reps": 10,
          "rest_seconds": 90,
          "notes": "optionnel"
        }
      ]
    }
  ]
}

Crée exactement ${daysPerWeek} jours. Maximum 8 exercices par jour. Inclus un warmup et cooldown si pertinent.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[generate-custom-program] API error:', res.status, err.slice(0, 200))
      return NextResponse.json({ error: `Erreur IA (${res.status})` }, { status: res.status })
    }

    const data = await res.json()
    const rawText = data.content?.[0]?.text || ''
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Pas de JSON dans la réponse' }, { status: 500 })

    const program = JSON.parse(jsonMatch[0])
    return NextResponse.json({ program })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erreur inattendue'
    console.error('[generate-custom-program] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
