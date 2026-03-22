import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 60

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const SYSTEM_PROMPT = `Tu es nutritionniste expert en fitness. Génère UNIQUEMENT le JSON d'UN jour de repas.
Réponds UNIQUEMENT avec du JSON valide et complet, sans markdown, sans texte autour.
TOUTES les valeurs numériques doivent être des nombres entiers, jamais vides ou null.
Format exact :
{
  "total_kcal": 2100,
  "total_protein": 140,
  "total_carbs": 220,
  "total_fat": 58,
  "repas": {
    "petit_dejeuner": [
      { "aliment": "Flocons d avoine cuits", "quantite_g": 80, "kcal": 290, "proteines": 10, "glucides": 54, "lipides": 6 }
    ],
    "dejeuner": [],
    "collation": [],
    "diner": []
  }
}`

async function generateOneDay(
  apiKey: string,
  day: string,
  params: { calorie_goal: number; protein_goal: number; carbs_goal: number; fat_goal: number; dietary_type: string; allergies: string[]; liked_foods_names: string[]; objective: string },
  previousDays: string[],
): Promise<any> {
  const variationHint = previousDays.length > 0
    ? `\nJours déjà générés (varie les repas) : ${previousDays.join(', ')}`
    : ''

  const userPrompt = `Génère le plan pour ${day.toUpperCase()} :
- Calories : ${params.calorie_goal} kcal ±50
- Protéines : ${params.protein_goal}g | Glucides : ${params.carbs_goal}g | Lipides : ${params.fat_goal}g
- Régime : ${params.dietary_type || 'omnivore'}
- Allergènes à éviter : ${(params.allergies || []).join(', ') || 'aucun'}
- Aliments préférés : ${(params.liked_foods_names || []).join(', ') || 'aucune préférence'}
- Objectif : ${params.objective || 'maintenance'}
- Aliments CUITS, quantités en multiples de 5g
- 4 repas : petit_dejeuner, dejeuner, collation, diner
- Maximum 4 aliments par repas${variationHint}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const rawText = data.content[0].text
  const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`No JSON for ${day}`)
  return JSON.parse(jsonMatch[0])
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key manquante' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const params = await req.json()

    // SSE stream: send progress events as each day completes
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const plan: Record<string, any> = {}
        const completedDays: string[] = []

        for (let i = 0; i < DAYS.length; i++) {
          const day = DAYS[i]
          // Send progress event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', day, index: i + 1, total: 7 })}\n\n`))

          try {
            const dayPlan = await generateOneDay(apiKey, day, params, completedDays)
            plan[day] = dayPlan
            completedDays.push(day)
          } catch (e) {
            console.error(`[meal-plan] Error generating ${day}:`, e)
            plan[day] = { total_kcal: 0, total_protein: 0, total_carbs: 0, total_fat: 0, repas: {} }
          }
        }

        // Send final result
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', plan })}\n\n`))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[generate-meal-plan] Error:', message)
    return new Response(JSON.stringify({ error: 'Erreur inattendue', detail: message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
