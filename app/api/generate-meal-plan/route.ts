import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 60

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const SYSTEM_PROMPT = `Tu es un nutritionniste expert spécialisé en fitness et hypertrophie. Tu génères des plans alimentaires STRICTS basés sur les macros du client.

RÈGLE #1 — MACROS STRICTES :
- Le total journalier DOIT être à ±30 kcal du calorie_goal
- Les protéines DOIVENT être à ±5g du protein_goal
- Les glucides DOIVENT être à ±10g du carbs_goal
- Les lipides DOIVENT être à ±5g du fat_goal
- VÉRIFIE la somme avant de répondre. Si le total dépasse la cible, RÉDUIS les quantités.

RÈGLE #2 — ALIMENTS :
- Utilise UNIQUEMENT les aliments de la liste fournie
- Les valeurs nutritionnelles sont pour 100g — calcule : kcal = (kcal_100g / 100) × quantite_g
- Quantités en multiples de 5g
- Maximum 4 aliments par repas

RÈGLE #3 — STRUCTURE DES REPAS :
- petit_dejeuner : féculents + fruits + laitage (PAS de viande)
- dejeuner : protéine + féculent + légume obligatoires
- collation : léger 150-250 kcal (laitage ou fruits + oléagineux)
- diner : protéine maigre + légumes, féculents limités

FORMAT JSON pour UN jour :
{
  "total_kcal": 2100,
  "total_protein": 140,
  "total_carbs": 220,
  "total_fat": 58,
  "repas": {
    "petit_dejeuner": [
      { "aliment": "Flocons d avoine", "quantite_g": 80, "kcal": 234, "proteines": 10, "glucides": 54, "lipides": 6 }
    ],
    "dejeuner": [],
    "collation": [],
    "diner": []
  }
}`

function extractProteins(dayPlan: any): string[] {
  const proteins: string[] = []
  if (!dayPlan?.repas) return proteins
  for (const meal of ['dejeuner', 'diner']) {
    const foods = dayPlan.repas[meal]
    if (!Array.isArray(foods) || foods.length === 0) continue
    const name = foods[0]?.aliment || ''
    if (name) proteins.push(name)
  }
  return proteins
}

function verifyDayPlan(day: any, targetKcal: number): any {
  let totalKcal = 0, totalP = 0, totalG = 0, totalL = 0
  for (const foods of Object.values(day.repas || {}) as any[]) {
    if (!Array.isArray(foods)) continue
    for (const item of foods) {
      totalKcal += item.kcal || 0
      totalP += item.proteines || 0
      totalG += item.glucides || 0
      totalL += item.lipides || 0
    }
  }
  if (Math.abs(totalKcal - targetKcal) > 50) {
    console.warn(`[meal-plan] Day off target: ${totalKcal} vs ${targetKcal} (diff: ${totalKcal - targetKcal})`)
  }
  return { ...day, total_kcal: totalKcal, total_protein: totalP, total_carbs: totalG, total_fat: totalL }
}

async function generateOneDay(
  apiKey: string,
  day: string,
  params: any,
  proteinsUsed: string[],
): Promise<any> {
  const proteinHint = proteinsUsed.length > 0
    ? `\nProtéines déjà utilisées (varie !) : ${proteinsUsed.join(', ')}`
    : ''

  // Build compact food list string for the prompt
  const foodListStr = (params.available_foods || [])
    .map((f: any) => `${f.nom} (${f.kcal}kcal, P${f.p} G${f.g} L${f.l} /100g)`)
    .join('\n')

  const userPrompt = `Génère le plan pour ${day.toUpperCase()} :

OBJECTIFS STRICTS (respecte-les à la lettre) :
- Calories : EXACTEMENT ${params.calorie_goal} kcal (tolérance ±30 kcal MAX)
- Protéines : ${params.protein_goal}g (±5g)
- Glucides : ${params.carbs_goal}g (±10g)
- Lipides : ${params.fat_goal}g (±5g)
- Régime : ${params.dietary_type || 'omnivore'}
- Allergènes : ${(params.allergies || []).join(', ') || 'aucun'}
- Objectif : ${params.objective || 'maintenance'}

ALIMENTS DISPONIBLES (valeurs /100g) :
${foodListStr || 'Utilise des aliments fitness classiques'}
${proteinHint}

CALCUL : pour chaque aliment, kcal = (kcal_100g / 100) × quantite_g
VÉRIFIE que la somme total_kcal = ${params.calorie_goal} ±30
VÉRIFIE que total_protein = ${params.protein_goal} ±5
Si le total est trop haut, RÉDUIS les quantités. Ne réponds PAS si les macros ne matchent pas.`

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
  const parsed = JSON.parse(jsonMatch[0])
  return verifyDayPlan(parsed, params.calorie_goal)
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key manquante' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const params = await req.json()

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
            const dayPlan = await generateOneDay(apiKey, day, params, proteinsUsed)
            plan[day] = dayPlan
            completedDays.push(day)
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
