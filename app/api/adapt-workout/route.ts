import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { exercises, availableMinutes, sessionType } = await req.json()

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Tu es un coach fitness expert. Le client a seulement ${availableMinutes} minutes pour sa séance de ${sessionType || 'musculation'}.
Programme complet prévu : ${JSON.stringify(exercises.map((e: any) => ({ name: e.name || e.exercise_name, sets: e.sets, reps: e.reps })))}

Adapte le programme pour ${availableMinutes} minutes :
- Garde les exercices composés en priorité
- Réduis le nombre de séries si nécessaire
- Supprime les exercices d'isolation moins importants

Réponds UNIQUEMENT en JSON valide :
[{"name": "...", "sets": N, "reps": "...", "rest_seconds": N, "priority": "haute/moyenne", "kept": true/false}]`
        }]
      })
    })

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ error: 'Format invalide' }, { status: 500 })
    const adapted = JSON.parse(jsonMatch[0])
    return NextResponse.json({ exercises: adapted })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
