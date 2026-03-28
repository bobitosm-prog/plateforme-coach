import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const maxDuration = 60

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function buildSystemPrompt(params: any) {
  const kcal = params.calorie_goal || 2500
  const prot = params.protein_goal || 150
  const carbs = params.carbs_goal || 250
  const fat = params.fat_goal || 70

  // Dynamic meal distribution based on total calories
  const pdjKcal = Math.round(kcal * 0.25)
  const dejKcal = Math.round(kcal * 0.35)
  const collKcal = Math.round(kcal * 0.10)
  const dinKcal = Math.round(kcal * 0.30)

  return `Tu es un nutritionniste expert en fitness. Tu génères UN jour de plan alimentaire en JSON.

═══ OBJECTIF CALORIQUE DU CLIENT : ${kcal} KCAL/JOUR ═══
Protéines : ${prot}g | Glucides : ${carbs}g | Lipides : ${fat}g

C'est un objectif de ${kcal} kcal, PAS 2000 kcal. Adapte les QUANTITÉS en conséquence.
${kcal > 2500 ? `Pour atteindre ${kcal} kcal, utilise des portions GÉNÉREUSES (150-250g de féculents, 200g+ de protéines, ajout d'huile/beurre de cacahuète).` : ''}

RÉPARTITION PAR REPAS :
- petit_dejeuner : ~${pdjKcal} kcal (${Math.round(kcal * 0.25)}±50)
- dejeuner : ~${dejKcal} kcal (${Math.round(kcal * 0.35)}±50)
- collation : ~${collKcal} kcal (${Math.round(kcal * 0.10)}±50)
- diner : ~${dinKcal} kcal (${Math.round(kcal * 0.30)}±50)
Total : ${pdjKcal + dejKcal + collKcal + dinKcal} ≈ ${kcal} kcal

RÈGLES :
1. Le total_kcal DOIT être entre ${kcal - 100} et ${kcal + 100}. Un jour à 2000 pour un objectif de ${kcal} est INACCEPTABLE.
2. Calcul : kcal_aliment = (kcal_100g / 100) × quantite_g
3. Quantités en multiples de 5g, 3-4 aliments par repas
4. VÉRIFIE ta somme avant de répondre

FORMAT JSON UNIQUE (pas de texte) :
{
  "total_kcal": ${kcal},
  "total_protein": ${prot},
  "total_carbs": ${carbs},
  "total_fat": ${fat},
  "repas": {
    "petit_dejeuner": [
      { "aliment": "Nom", "quantite_g": 100, "kcal": 350, "proteines": 10, "glucides": 50, "lipides": 6 }
    ],
    "dejeuner": [...],
    "collation": [...],
    "diner": [...]
  }
}`
}

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
  if (Math.abs(totalKcal - targetKcal) > 150) {
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
  const kcal = params.calorie_goal || 2500
  const proteinHint = proteinsUsed.length > 0
    ? `\nProtéines déjà utilisées les jours précédents (VARIE !) : ${proteinsUsed.join(', ')}`
    : ''

  const foodListStr = (params.available_foods || [])
    .map((f: any) => `${f.nom} (${f.kcal}kcal, P${f.p} G${f.g} L${f.l} /100g)`)
    .join('\n')

  const userPrompt = `Génère le plan pour ${day.toUpperCase()}.

RAPPEL : l'objectif est ${kcal} kcal, ${params.protein_goal}g protéines, ${params.carbs_goal}g glucides, ${params.fat_goal}g lipides.
Régime : ${params.dietary_type || 'omnivore'} | Allergènes : ${(params.allergies || []).join(', ') || 'aucun'}

ALIMENTS DISPONIBLES (valeurs /100g) :
${foodListStr || 'Utilise des aliments fitness classiques.'}
${proteinHint}

RAPPEL FINAL : le total_kcal de ce jour DOIT être entre ${kcal - 100} et ${kcal + 100}. Réponds UNIQUEMENT en JSON.`

  console.log(`[meal-plan] Generating ${day}: target=${kcal}kcal, P=${params.protein_goal}g, G=${params.carbs_goal}g, L=${params.fat_goal}g`)

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
      system: buildSystemPrompt(params),
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
  return verifyDayPlan(parsed, kcal)
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key manquante' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const params = await req.json()
    console.log('[meal-plan] Request params:', { calorie_goal: params.calorie_goal, protein_goal: params.protein_goal, carbs_goal: params.carbs_goal, fat_goal: params.fat_goal, foods_count: params.available_foods?.length })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const plan: Record<string, any> = {}
        const proteinsUsed: string[] = []

        for (let i = 0; i < DAYS.length; i++) {
          const day = DAYS[i]
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', day, index: i + 1, total: 7 })}\n\n`))

          try {
            const dayPlan = await generateOneDay(apiKey, day, params, proteinsUsed)
            plan[day] = dayPlan
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
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[generate-meal-plan] Error:', message)
    return new Response(JSON.stringify({ error: 'Erreur inattendue', detail: message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
