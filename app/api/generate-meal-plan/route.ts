import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit } from '../../../lib/rate-limit'
import { NUTRITION_GENERATION_PROMPT } from '../../../lib/coach-knowledge'
import { MEAL_KEY_TO_TYPE, type MealKey, type DayPlan } from '../../../lib/meal-plan'

export const maxDuration = 300

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

  const diet = params.dietary_type || 'omnivore'

  // Objective context
  const objMode = params.objective_mode || 'maintien'
  const caloricAdj = params.caloric_adjustment || 0
  const tdee = params.tdee || kcal
  const objectiveBlock = objMode === 'seche'
    ? `SÈCHE — Perte de graisse. Déficit de ${Math.abs(caloricAdj)} kcal/jour sous le TDEE (${tdee} kcal). Priorité : maintien musculaire, protéines hautes. Favorise les aliments rassasiants (légumes verts, protéines maigres, fibres).`
    : objMode === 'bulk'
    ? `BULK — Prise de masse. Surplus de ${caloricAdj} kcal/jour au-dessus du TDEE (${tdee} kcal). Priorité : glucides élevés pour performance. Portions généreuses de féculents, collation dense.`
    : `MAINTIEN — Stabilité du poids. Calories = TDEE (${tdee} kcal). Équilibre macro.`

  // Dietary-specific rules
  const dietaryRules = diet === 'keto'
    ? `\nRÈGLES RÉGIME KETO : glucides MAXIMUM 50g/jour total.
Pas de riz, pâtes, pain, pommes de terre, fruits sucrés.
Privilégie : viandes grasses, poissons, oeufs, fromages, légumes verts, avocat, noix, huile d'olive, beurre.
Les lipides doivent représenter 65-75% des calories.`
    : diet === 'paleo'
    ? `\nRÈGLES RÉGIME PALÉO : Interdit céréales, légumineuses, produits laitiers, sucres raffinés, huiles végétales transformées.
Autorisé : viandes, poissons, oeufs, légumes, fruits, noix, huile d'olive/coco, patate douce, miel.`
    : diet === 'mediterraneen'
    ? `\nRÈGLES RÉGIME MÉDITERRANÉEN : Beaucoup de poissons, légumes, légumineuses, huile d'olive, céréales complètes, fruits.
Viande rouge max 2x/semaine. Peu de produits transformés. Privilégie huile d'olive comme matière grasse principale.`
    : diet === 'halal'
    ? `\nRÈGLES HALAL : Pas de porc ni de dérivés (jambon, bacon, lardons, gélatine de porc). Pas d'alcool dans les recettes. Viandes halal uniquement.`
    : diet === 'kosher'
    ? `\nRÈGLES KOSHER : Pas de porc ni crustacés. Ne jamais mélanger viande et produits laitiers dans le même repas. Poissons à écailles uniquement.`
    : diet === 'gluten_free' || diet === 'sans_gluten'
    ? `\nRÈGLES SANS GLUTEN : Pas de blé, orge, seigle, épeautre. Pas de pain, pâtes, couscous, boulghour classiques.
Remplace par : riz, quinoa, sarrasin, maïs, pommes de terre, patate douce, légumineuses.`
    : diet === 'lactose_free' || diet === 'sans_lactose'
    ? `\nRÈGLES SANS LACTOSE : Pas de lait, fromage frais, crème, yaourt classique.
Remplace par : lait d'amande/soja/avoine, yaourt végétal, fromages affinés (souvent tolérés).`
    : ''

  const proteinRules = diet === 'vegan'
    ? `- Petit-déjeuner : tofu brouillé, protéine végétale en poudre, ou beurre de cacahuète
- Déjeuner : TOUJOURS inclure tofu, tempeh, ou seitan comme source principale (150-250g)
- Collation : protéine végétale, amandes, edamame
- Dîner : TOUJOURS inclure une source différente du déjeuner (tofu au déj → tempeh au dîner)`
    : diet === 'vegetarian' || diet === 'vegetarien'
    ? `- Petit-déjeuner : oeufs, yaourt grec, fromage blanc, ou whey
- Déjeuner : TOUJOURS inclure oeufs, tofu, ou fromage comme source principale
- Collation : whey, yaourt grec, fromage blanc, amandes
- Dîner : TOUJOURS inclure une source DIFFÉRENTE du déjeuner`
    : diet === 'pescetarien'
    ? `- Petit-déjeuner : oeufs, yaourt grec, fromage blanc, ou whey
- Déjeuner : TOUJOURS inclure du POISSON comme source principale (saumon, thon, cabillaud, crevettes — 150-250g)
- Collation : whey, yaourt grec, fromage blanc, oeufs
- Dîner : TOUJOURS inclure du POISSON DIFFÉRENT du déjeuner (saumon au déj → cabillaud au dîner)`
    : diet === 'keto'
    ? `- Petit-déjeuner : oeufs (2-3), bacon, avocat, fromage — PAS de pain ni céréales
- Déjeuner : VIANDE ou POISSON gras (150-250g) + légumes verts sautés à l'huile + avocat/fromage
- Collation : fromage, noix, olives, oeuf dur
- Dîner : VIANDE ou POISSON (150-250g) + légumes verts + source lipidique (huile, beurre, avocat)`
    : `- Petit-déjeuner : oeufs, yaourt grec, fromage blanc, ou whey
- Déjeuner : TOUJOURS inclure une VIANDE ou POISSON comme plat principal (poulet, boeuf, dinde, saumon, thon — 150-250g pour 30-50g de protéines)
- Collation : whey, yaourt grec, fromage blanc, amandes, oeufs
- Dîner : TOUJOURS inclure une VIANDE ou POISSON DIFFÉRENTE du déjeuner (si poulet au déj → poisson ou boeuf au dîner)`

  const weeklyVariety = diet === 'omnivore' || diet === 'halal' || diet === 'kosher' || diet === 'paleo' || diet === 'mediterraneen' ? `
VARIÉTÉ PROTÉINES SUR LA SEMAINE :
- Alterner viande blanche (poulet, dinde), viande rouge (boeuf, steak haché), poisson (saumon, thon, cabillaud, crevettes)
- Ne JAMAIS répéter la même protéine principale 2 jours de suite au même repas
- Sur 7 jours : minimum 3 repas poisson, 2 viande blanche, 2 viande rouge` : ''

  return `${NUTRITION_GENERATION_PROMPT}

Tu generes UN jour de plan alimentaire en JSON.

═══ OBJECTIF CALORIQUE DU CLIENT : ${kcal} KCAL/JOUR ═══
Protéines : ${prot}g | Glucides : ${carbs}g | Lipides : ${fat}g
Régime : ${diet}

OBJECTIF DU CLIENT : ${objectiveBlock}
${params.activity_level ? `Niveau d'activité : ${params.activity_level}` : ''}
${dietaryRules}

C'est un objectif de ${kcal} kcal, PAS 2000 kcal. Adapte les QUANTITÉS en conséquence.
${kcal > 2500 ? `Pour atteindre ${kcal} kcal, utilise des portions GÉNÉREUSES (150-250g de féculents, 200g+ de protéines, ajout d'huile/beurre de cacahuète).` : ''}

PROTÉINES PAR REPAS (${diet}) :
${proteinRules}
${weeklyVariety}

${params.scanned_foods?.length ? `
ALIMENTS DU CLIENT (à utiliser EN PRIORITÉ) :
Le client a ces aliments chez lui. Utilise-les en priorité :
${params.scanned_foods.map((f: any) => `- ${f.name}${f.brand ? ' (' + f.brand + ')' : ''}: ${f.calories}kcal, P${f.proteins}g, G${f.carbs}g, L${f.fat}g /100g`).join('\n')}
Complète avec les aliments fitness de base si nécessaire.
` : ''}
RÉPARTITION CALORIQUE PAR REPAS :
- petit_dejeuner : ~${pdjKcal} kcal
- dejeuner : ~${dejKcal} kcal
- collation : ~${collKcal} kcal
- diner : ~${dinKcal} kcal
Total : ${pdjKcal + dejKcal + collKcal + dinKcal} ≈ ${kcal} kcal

RÈGLES :
1. Le total_kcal DOIT être entre ${kcal - 50} et ${kcal + 50}. C'est NON NÉGOCIABLE.
2. Calcul : kcal_aliment = (kcal_100g / 100) × quantite_g
3. Quantités en multiples de 5g, 3-4 aliments par repas

VÉRIFICATION OBLIGATOIRE avant de retourner le JSON :
- Additionne les kcal de tous les aliments de la journée
- Si total < ${kcal - 50} : augmente les portions de féculents (+30-50g), ajoute huile d'olive (10g = 88 kcal)
- Si total > ${kcal + 50} : réduis les portions de féculents (-20-30g)
- Le total FINAL doit être entre ${kcal - 50} et ${kcal + 50}

${params.ai_photo_analysis ? `
ANALYSE VISUELLE DU CLIENT :
${params.ai_photo_analysis}

Tiens compte de cette analyse pour affiner le plan alimentaire.
Si l'analyse détecte un taux de graisse élevé → favorise un déficit modéré.
Si l'analyse détecte une morphologie athlétique → maintiens les apports protéiques élevés.
` : ''}FORMAT JSON UNIQUE (pas de texte) :
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

/**
 * Convert legacy LLM day output (repas{} + French fields) to canonical DayPlan.
 * The LLM prompt stays in legacy format (reliable); conversion happens after.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertLegacyDayToCanonical(legacyDay: any): DayPlan {
  const repas = legacyDay?.repas ?? {}
  const meals = (Object.keys(MEAL_KEY_TO_TYPE) as MealKey[]).map(key => {
    const rawFoods = Array.isArray(repas[key]) ? repas[key] : []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      type: MEAL_KEY_TO_TYPE[key],
      foods: rawFoods.map((f: any) => ({
        name: String(f?.aliment ?? '').trim(),
        qty:  Number(f?.quantite_g ?? 0) || 0,
        kcal: Number(f?.kcal ?? 0) || 0,
        prot: Number(f?.proteines ?? 0) || 0,
        carb: Number(f?.glucides ?? 0) || 0,
        fat:  Number(f?.lipides ?? 0) || 0,
      })),
    }
  })
  return {
    meals,
    totals: {
      kcal: Number(legacyDay?.total_kcal ?? 0) || 0,
      prot: Number(legacyDay?.total_protein ?? 0) || 0,
      carb: Number(legacyDay?.total_carbs ?? 0) || 0,
      fat:  Number(legacyDay?.total_fat ?? 0) || 0,
    },
  }
}

function verifyDayPlan(day: any, targetKcal: number): any {
  let totalKcal = 0, totalP = 0, totalG = 0, totalL = 0
  for (const foods of Object.values(day.repas || {}) as any[]) {
    if (!Array.isArray(foods)) continue
    for (const item of foods) {
      // Round all AI-generated values to integers
      item.quantite_g = Math.round(item.quantite_g || 0)
      item.kcal = Math.round(item.kcal || 0)
      item.proteines = Math.round(item.proteines || 0)
      item.glucides = Math.round(item.glucides || 0)
      item.lipides = Math.round(item.lipides || 0)
      totalKcal += item.kcal
      totalP += item.proteines
      totalG += item.glucides
      totalL += item.lipides
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

  // Per-meal preferences
  const mfn = params.meal_food_names || {}
  const prefHint = [
    mfn.morning?.length ? `Petit-déj favori : ${mfn.morning.join(', ')}` : '',
    mfn.lunch?.length ? `Déjeuner favori : ${mfn.lunch.join(', ')}` : '',
    mfn.snack?.length ? `Collation favorite : ${mfn.snack.join(', ')}` : '',
    mfn.dinner?.length ? `Dîner favori : ${mfn.dinner.join(', ')}` : '',
  ].filter(Boolean).join('\n')

  const objMode = params.objective_mode || 'maintien'
  const caloricAdj = params.caloric_adjustment || 0
  const objReminder = objMode === 'seche'
    ? `Rappel objectif : SÈCHE — déficit de ${Math.abs(caloricAdj)} kcal vs TDEE. Aliments rassasiants, protéines hautes.`
    : objMode === 'bulk'
    ? `Rappel objectif : BULK — surplus de +${caloricAdj} kcal vs TDEE. Portions généreuses, glucides élevés.`
    : `Rappel objectif : MAINTIEN — calories = TDEE.`

  const userPrompt = `Génère le plan pour ${day.toUpperCase()}.

${objReminder}

OBJECTIFS STRICTS : ${kcal} kcal (±50 MAX), ${params.protein_goal}g P, ${params.carbs_goal}g G, ${params.fat_goal}g L
Allergènes : ${(params.allergies || []).join(', ') || 'aucun'}
${params.disliked_foods?.length ? `Aliments à ÉVITER (le client n'aime pas) : ${params.disliked_foods.join(', ')}` : ''}

${prefHint ? `PRÉFÉRENCES DU CLIENT :\n${prefHint}\nUtilise ces aliments en VARIANT chaque jour. Ne répète PAS le même petit-déjeuner 2 jours de suite.\n` : ''}ALIMENTS DISPONIBLES (valeurs /100g) :
${foodListStr || 'Utilise des aliments fitness classiques.'}
${proteinHint}

VARIÉTÉ : ce jour doit être DIFFÉRENT des précédents. 7 petits-déj différents, 7 déjeuners différents, 7 dîners différents.
Déjeuner et dîner : protéine animale/principale (150-250g) OBLIGATOIRE.
${params.scanned_foods?.length ? `\nAliments prioritaires du client : ${params.scanned_foods.slice(0, 10).map((f: any) => f.name).join(', ')}` : ''}
TOTAL KCAL de ce jour : entre ${kcal - 50} et ${kcal + 50}. Réponds UNIQUEMENT en JSON.`

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
  // Auth check
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`meal-plan:${ip}`, 3, 60000)
  if (!rl.allowed) return new Response(JSON.stringify({ error: 'Trop de requetes. Reessayez dans ' + rl.retryAfter + 's.' }), { status: 429 })
  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key manquante' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const params = await req.json()

    // Guard: invited clients cannot generate AI meal plans
    const userId = user.id
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { guardInvitedClient } = await import('../../../lib/api-guard')
      const blocked = await guardInvitedClient(userId)
      if (blocked) return blocked
    }
    const encoder = new TextEncoder()
    const startTime = Date.now()
    const stream = new ReadableStream({
      async start(controller) {
        const plan: Record<string, any> = {}
        const proteinsUsed: string[] = []

        for (let i = 0; i < DAYS.length; i++) {
          const day = DAYS[i]
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', day, index: i + 1, total: 7 })}\n\n`))

          try {
            const legacyDay = await generateOneDay(apiKey, day, params, proteinsUsed)
            // extractProteins reads legacy structure (repas{} + aliment), call BEFORE conversion
            proteinsUsed.push(...extractProteins(legacyDay))
            // Convert to canonical for storage + streaming to client
            plan[day] = convertLegacyDayToCanonical(legacyDay)
          } catch (e) {
            console.error(`[meal-plan] Error generating ${day}:`, e)
            plan[day] = { meals: [], totals: { kcal: 0, prot: 0, carb: 0, fat: 0 } }
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
