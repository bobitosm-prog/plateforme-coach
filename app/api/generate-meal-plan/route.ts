import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 60

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function buildSystemPrompt(likedFoods: string): string {
  return `Tu es un nutritionniste expert en fitness. Tu génères des plans alimentaires réalistes et cohérents.
Réponds UNIQUEMENT avec du JSON valide.
TOUTES les valeurs numériques sont des entiers, jamais null ou vides.

RÈGLES STRICTES PAR REPAS :

PETIT-DÉJEUNER (énergétique, sucré ou salé léger) :
- Exemples : flocons d avoine + fruits + yaourt grec
- PAS de viande, PAS de saumon, PAS de riz

DÉJEUNER (repas principal, complet) :
- Protéine + féculent + légume obligatoires
- Exemples : poulet + riz basmati + brocoli, saumon + patate douce + épinards

COLLATION (légère, 200-300 kcal max) :
- Exemples : yaourt grec + fruits rouges, fromage blanc + amandes
- PAS de repas complet, PAS de saumon, PAS de viande

DÎNER (léger, digeste, moins de glucides) :
- Protéine maigre + légumes obligatoires, féculents limités
- Exemples : blanc de poulet + courgettes, cabillaud + haricots verts
- PAS de flocons d avoine, PAS de banane

RÈGLES GÉNÉRALES :
- Varie les protéines : NE PAS répéter la même protéine plus de 2 fois par semaine pour le même repas
- Utilise en priorité les aliments préférés du client : ${likedFoods || 'aucune préférence'}
- Quantités réalistes en multiples de 5g
- 4 repas par jour : petit_dejeuner, dejeuner, collation, diner
- Maximum 4 aliments par repas

Format JSON exact :
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
}

function extractProteins(dayPlan: any): string[] {
  const proteins: string[] = []
  if (!dayPlan?.repas) return proteins
  for (const meal of ['dejeuner', 'diner']) {
    const foods = dayPlan.repas[meal]
    if (!Array.isArray(foods) || foods.length === 0) continue
    // First food in dejeuner/diner is usually the protein
    const name = foods[0]?.aliment || ''
    if (name) proteins.push(name)
  }
  return proteins
}

async function generateOneDay(
  apiKey: string,
  day: string,
  params: { calorie_goal: number; protein_goal: number; carbs_goal: number; fat_goal: number; dietary_type: string; allergies: string[]; liked_foods_names: string[]; objective: string },
  previousDays: string[],
  proteinsUsed: string[],
): Promise<any> {
  const proteinHint = proteinsUsed.length > 0
    ? `\nProtéines déjà utilisées les jours précédents (varie !) : ${proteinsUsed.join(', ')}`
    : ''
  const daysHint = previousDays.length > 0
    ? `\nJours déjà générés : ${previousDays.join(', ')}`
    : ''

  const userPrompt = `Génère le plan pour ${day.toUpperCase()} :
- Calories : ${params.calorie_goal} kcal ±50
- Protéines : ${params.protein_goal}g | Glucides : ${params.carbs_goal}g | Lipides : ${params.fat_goal}g
- Régime : ${params.dietary_type || 'omnivore'}
- Allergènes à éviter : ${(params.allergies || []).join(', ') || 'aucun'}
- Objectif : ${params.objective || 'maintenance'}
- Aliments CUITS, quantités en multiples de 5g${daysHint}${proteinHint}`

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
      system: buildSystemPrompt((params.liked_foods_names || []).join(', ')),
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
        const proteinsUsed: string[] = []

        for (let i = 0; i < DAYS.length; i++) {
          const day = DAYS[i]
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', day, index: i + 1, total: 7 })}\n\n`))

          try {
            const dayPlan = await generateOneDay(apiKey, day, params, completedDays, proteinsUsed)
            plan[day] = dayPlan
            completedDays.push(day)
            // Track proteins for variety
            proteinsUsed.push(...extractProteins(dayPlan))
          } catch (e) {
            console.error(`[meal-plan] Error generating ${day}:`, e)
            plan[day] = { total_kcal: 0, total_protein: 0, total_carbs: 0, total_fat: 0, repas: {} }
          }
        }

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
