/* eslint-disable @typescript-eslint/no-explicit-any -- Legacy AI JSON boundary is normalized and validated below. */
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, checkAiRateLimit, checkAiQuota, logAiUsage, aiRateLimitResponse, aiQuotaResponse } from '../../../lib/rate-limit'
import { NUTRITION_GENERATION_PROMPT } from '../../../lib/coach-knowledge'
import { formatFitnessFoodsForPrompt } from '../../../lib/fitness-food-database'
import { MEAL_KEY_TO_TYPE, type MealKey, type DayPlan } from '../../../lib/meal-plan'
import { AthenaNutritionOutputError, fitAthenaNutritionDayToTargets, validateAthenaNutritionDay } from '../../../lib/athena/nutrition-output'
import { guardCoachManagedCapabilities } from '../../../lib/api-guard'
import { athenaNutritionRequestSchema } from '../../../lib/athena/nutrition-input'
import { buildAthenaScientificPolicyPrompt } from '../../../lib/athena/scientific-policy'
import { loadAthenaGenerationContext } from '../../../lib/athena/generation-context'
import { resolveFitnessFood } from '../../../lib/nutrition/food-reference'
import { replacePersonalMealPlan } from '../../../lib/meal-plan/replace-personal-plan'
import { NUTRITION_PROVIDER_OUTPUT_FORMAT, NutritionProviderOutputError, parseNutritionProviderOutput } from '../../../lib/athena/nutrition-provider-output'

export const maxDuration = 300

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const GENERATION_CONCURRENCY = 3

async function mapWithConcurrency<T, R>(items: readonly T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker))
  return results
}

function normalizeDietaryType(value: unknown): string {
  return value === 'mediterraneen' ? 'mediterranean' : String(value || 'omnivore')
}

function canonicalPreferenceNames(params: any): string[] {
  const mealNames = Object.values(params.meal_food_names || {}).flat()
  const availableNames = (params.available_foods || []).map((food: any) => food?.nom)
  const scannedNames = (params.scanned_foods || []).map((food: any) => food?.name)

  return [...new Set([...mealNames, ...availableNames, ...scannedNames]
    .filter((name): name is string => typeof name === 'string')
    .map(name => resolveFitnessFood(name)?.name)
    .filter((name): name is string => Boolean(name)))]
}

function buildSystemPrompt(params: any, clientContext: string) {
  const kcal = params.calorie_goal || 2500
  const prot = params.protein_goal || 150
  const carbs = params.carbs_goal || 250
  const fat = params.fat_goal || 70

  // Dynamic meal distribution based on total calories
  const pdjKcal = Math.round(kcal * 0.25)
  const dejKcal = Math.round(kcal * 0.35)
  const collKcal = Math.round(kcal * 0.10)
  const dinKcal = Math.round(kcal * 0.30)

  // Macro distribution per meal (same ratios as kcal)
  const pdjP = Math.round(prot * 0.25), dejP = Math.round(prot * 0.35), collP = Math.round(prot * 0.10), dinP = Math.round(prot * 0.30)
  const pdjG = Math.round(carbs * 0.25), dejG = Math.round(carbs * 0.35), collG = Math.round(carbs * 0.10), dinG = Math.round(carbs * 0.30)
  const pdjL = Math.round(fat * 0.25), dejL = Math.round(fat * 0.35), collL = Math.round(fat * 0.10), dinL = Math.round(fat * 0.30)

  const diet = normalizeDietaryType(params.dietary_type)

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
    : diet === 'mediterranean'
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
    : diet === 'pescatarian' || diet === 'pescetarien'
    ? `- Petit-déjeuner : oeufs, yaourt grec, fromage blanc, ou whey
- Déjeuner : TOUJOURS inclure du POISSON comme source principale (saumon, thon, cabillaud, crevettes — 150-250g)
- Collation : whey, yaourt grec, fromage blanc, oeufs
- Dîner : TOUJOURS inclure du POISSON DIFFÉRENT du déjeuner (saumon au déj → cabillaud au dîner)`
    : diet === 'flexitarian'
    ? `- Varie les protéines végétales (lentilles, pois chiches, tofu), les oeufs, le poisson et les viandes non transformées
- Ne rends pas la viande obligatoire à chaque déjeuner ou dîner
- Utilise des sources protéiques différentes au fil de la journée`
    : diet === 'keto'
    ? `- Petit-déjeuner : oeufs (2-3), bacon, avocat, fromage — PAS de pain ni céréales
- Déjeuner : VIANDE ou POISSON gras (150-250g) + légumes verts sautés à l'huile + avocat/fromage
- Collation : fromage, noix, olives, oeuf dur
- Dîner : VIANDE ou POISSON (150-250g) + légumes verts + source lipidique (huile, beurre, avocat)`
    : `- Petit-déjeuner : oeufs, yaourt grec, fromage blanc, ou whey
- Déjeuner : TOUJOURS inclure une VIANDE ou POISSON comme plat principal (poulet, boeuf, dinde, saumon, thon). Ajuste la quantité pour ATTEINDRE la cible protéique du repas (~${dejP}g), PAS plus.
- Collation : whey, yaourt grec, fromage blanc, amandes, oeufs
- Dîner : TOUJOURS inclure une VIANDE ou POISSON DIFFÉRENTE du déjeuner (si poulet au déj → poisson ou boeuf au dîner). Ajuste la quantité pour ~${dinP}g de protéines.
IMPORTANT : Ne dépasse PAS la cible protéique globale de ${prot}g — c'est aussi important que les calories.`

  const weeklyVariety = diet === 'omnivore' || diet === 'halal' || diet === 'kosher' || diet === 'paleo' || diet === 'mediterranean' ? `
VARIÉTÉ PROTÉINES SUR LA SEMAINE :
- Alterner viande blanche (poulet, dinde), viande rouge (boeuf, steak haché), poisson (saumon, thon, cabillaud, crevettes)
- Ne JAMAIS répéter la même protéine principale 2 jours de suite au même repas
- Sur 7 jours : minimum 3 repas poisson, 2 viande blanche, 2 viande rouge` : ''

  return `${NUTRITION_GENERATION_PROMPT}

${buildAthenaScientificPolicyPrompt()}

${clientContext}

Tu generes UN jour de plan alimentaire en JSON.

═══ OBJECTIF CALORIQUE DU CLIENT : ${kcal} KCAL/JOUR ═══
Protéines : ${prot}g | Glucides : ${carbs}g | Lipides : ${fat}g
Régime : ${diet}
Restrictions déclarées par le client : ${params.dietary_restrictions || 'aucune'}

OBJECTIF DU CLIENT : ${objectiveBlock}
${params.activity_level ? `Niveau d'activité : ${params.activity_level}` : ''}
${dietaryRules}

C'est un objectif de ${kcal} kcal, PAS 2000 kcal. Adapte les QUANTITÉS en conséquence.
${kcal > 2500 ? `Pour atteindre ${kcal} kcal, utilise des portions GÉNÉREUSES (150-250g de féculents, 200g+ de protéines, ajout d'huile/beurre de cacahuète).` : ''}

PROTÉINES PAR REPAS (${diet}) :
${proteinRules}
${weeklyVariety}

═══ BASE D'ALIMENTS DE RÉFÉRENCE (valeurs pour 100g) ═══
${formatFitnessFoodsForPrompt()}

RÈGLES STRICTES (non négociables) :
- Utilise EN PRIORITÉ les aliments de cette base avec EXACTEMENT ces valeurs.
- Ne JAMAIS inventer de kcal/protéines/glucides/lipides pour ces aliments.
- Si un aliment nécessaire n'est pas dans la liste, remplace-le par l'aliment
  le plus proche disponible dans la base.
- Les valeurs sont pour 100g dans l'état indiqué (cuit/cru/sec/prêt à consommer).
  Respecte cet état dans tes calculs de portions.

RÉPARTITION PAR REPAS (kcal ET macros) :
- petit_dejeuner : ~${pdjKcal} kcal | P:${pdjP}g G:${pdjG}g L:${pdjL}g
- dejeuner : ~${dejKcal} kcal | P:${dejP}g G:${dejG}g L:${dejL}g
- collation : ~${collKcal} kcal | P:${collP}g G:${collG}g L:${collL}g
- diner : ~${dinKcal} kcal | P:${dinP}g G:${dinG}g L:${dinL}g
Total : ${pdjKcal + dejKcal + collKcal + dinKcal} ≈ ${kcal} kcal | P:${prot}g G:${carbs}g L:${fat}g

RÈGLES :
1. Le total_kcal DOIT être entre ${kcal - 50} et ${kcal + 50}. C'est NON NÉGOCIABLE.
2. Les macros DOIVENT être proches des cibles : protéines ${prot}g (±10%), glucides ${carbs}g (±10%), lipides ${fat}g (±10%). C'est aussi NON NÉGOCIABLE.
3. Calcul : kcal_aliment = (kcal_100g / 100) × quantite_g
4. Quantités en multiples de 5g, 3-4 aliments par repas
5. CONVENTION DE PESÉE — OBLIGATOIRE :
Tous les aliments qui se cuisent (riz, pâtes, légumineuses, quinoa, semoule, etc.) doivent être indiqués PESÉS CUITS, avec les valeurs nutritionnelles correspondant au poids CUIT.
- Recopie le nom EXACT de la base, état inclus. Aucun synonyme ni nom composé ne sera accepté.
- Utilise les valeurs nutritionnelles du CUIT : riz/pâtes cuits ≈ 130 kcal/100g et ~28g de glucides/100g (PAS 350 kcal/100g qui correspond au cru).
- Lentilles/légumineuses cuites ≈ 115-130 kcal/100g.
- Viandes, poissons et œufs : respecte strictement l'état cru ou cuit indiqué dans le nom de la base.
- Légumes, fruits, produits laitiers : poids tels quels (déjà consommables).

VÉRIFICATION OBLIGATOIRE avant de retourner le JSON :
- Additionne les kcal de tous les aliments de la journée
- Si total < ${kcal - 50} : augmente les portions de féculents (+30-50g), ajoute huile d'olive (10g = 88 kcal)
- Si total > ${kcal + 50} : réduis les portions de féculents (-20-30g)
- Le total FINAL doit être entre ${kcal - 50} et ${kcal + 50}
- Additionne les protéines totales : si > ${Math.round(prot * 1.1)}g, RÉDUIS les portions de viande/poisson/protéines. Si < ${Math.round(prot * 0.9)}g, augmente-les.
- Additionne les glucides : si < ${Math.round(carbs * 0.9)}g, AUGMENTE les féculents/fruits. Si > ${Math.round(carbs * 1.1)}g, réduis-les.
- Additionne les lipides : si > ${Math.round(fat * 1.1)}g, réduis huiles/fromages/oléagineux.

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

/**
 * Convert legacy LLM day output (repas{} + French fields) to canonical DayPlan.
 * The LLM prompt stays in legacy format (reliable); conversion happens after.
 */
function convertLegacyDayToCanonical(legacyDay: any): DayPlan {
  const repas = legacyDay?.repas ?? {}
  const meals = (Object.keys(MEAL_KEY_TO_TYPE) as MealKey[]).map(key => {
    const rawFoods = Array.isArray(repas[key]) ? repas[key] : []
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

async function generateOneDay(
  apiKey: string,
  day: string,
  params: any,
  proteinsUsed: string[],
  clientContext: string,
  repairAttempt = false,
): Promise<any> {
  const kcal = params.calorie_goal || 2500
  const proteinHint = proteinsUsed.length > 0
    ? `\nProtéines déjà utilisées les jours précédents (VARIE !) : ${proteinsUsed.join(', ')}`
    : ''

  const canonicalPreferences = canonicalPreferenceNames(params)

  // Per-meal preferences
  const mfn = params.meal_food_names || {}
  const canonicalMealNames = (names: unknown): string[] => Array.isArray(names)
    ? names.map(name => typeof name === 'string' ? resolveFitnessFood(name)?.name : null)
      .filter((name): name is string => Boolean(name))
    : []
  const prefHint = [
    canonicalMealNames(mfn.morning).length ? `Petit-déj favori : ${canonicalMealNames(mfn.morning).join(', ')}` : '',
    canonicalMealNames(mfn.lunch).length ? `Déjeuner favori : ${canonicalMealNames(mfn.lunch).join(', ')}` : '',
    canonicalMealNames(mfn.snack).length ? `Collation favorite : ${canonicalMealNames(mfn.snack).join(', ')}` : '',
    canonicalMealNames(mfn.dinner).length ? `Dîner favori : ${canonicalMealNames(mfn.dinner).join(', ')}` : '',
  ].filter(Boolean).join('\n')

  const objMode = params.objective_mode || 'maintien'
  const caloricAdj = params.caloric_adjustment || 0
  const objReminder = objMode === 'seche'
    ? `Rappel objectif : SÈCHE — déficit de ${Math.abs(caloricAdj)} kcal vs TDEE. Aliments rassasiants, protéines hautes.`
    : objMode === 'bulk'
    ? `Rappel objectif : BULK — surplus de +${caloricAdj} kcal vs TDEE. Portions généreuses, glucides élevés.`
    : `Rappel objectif : MAINTIEN — calories = TDEE.`

  const repairHint = repairAttempt
    ? `\nCORRECTION OBLIGATOIRE : la proposition précédente n'a pas respecté le contrat. Utilise uniquement les noms EXACTS de la base, respecte les allergies et recalcule les quantités pour atteindre les quatre objectifs.\n`
    : ''

  const userPrompt = `Génère le plan pour ${day.toUpperCase()}.
${repairHint}

${objReminder}

OBJECTIFS STRICTS : ${kcal} kcal (±50 MAX), Protéines ${params.protein_goal}g (max ${Math.round((params.protein_goal || 150) * 1.1)}g), Glucides ${params.carbs_goal}g (min ${Math.round((params.carbs_goal || 250) * 0.9)}g), Lipides ${params.fat_goal}g (max ${Math.round((params.fat_goal || 70) * 1.1)}g)
Allergènes structurés : ${(params.allergies || []).join(', ') || 'aucun'}
Restrictions déclarées : ${params.dietary_restrictions || 'aucune'}
${params.disliked_foods?.length ? `Aliments à ÉVITER (le client n'aime pas) : ${params.disliked_foods.join(', ')}` : ''}

${prefHint ? `PRÉFÉRENCES DU CLIENT :\n${prefHint}\nUtilise ces aliments en VARIANT chaque jour. Ne répète PAS le même petit-déjeuner 2 jours de suite.\n` : ''}${canonicalPreferences.length ? `ALIMENTS CANONIQUES DISPONIBLES À PRIVILÉGIER : ${canonicalPreferences.join(', ')}\n` : ''}
${proteinHint}

VARIÉTÉ : ce jour doit être DIFFÉRENT des précédents. 7 petits-déj différents, 7 déjeuners différents, 7 dîners différents.
Déjeuner et dîner : inclure une source protéique compatible avec le régime déclaré.
Aliments féculents (riz, pâtes, légumineuses) : TOUJOURS pesés et calculés CUITS (~130 kcal/100g pour riz/pâtes), jamais crus.
TOTAL KCAL de ce jour : entre ${kcal - 50} et ${kcal + 50}. Réponds UNIQUEMENT en JSON.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      // Four meals with 3-4 structured foods can legitimately exceed 1,500
      // tokens; truncating here produces an unrecoverable partial JSON object.
      max_tokens: 2500,
      output_config: { format: NUTRITION_PROVIDER_OUTPUT_FORMAT },
      system: buildSystemPrompt(params, clientContext),
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const parsed = parseNutritionProviderOutput(data)
  // The model chooses foods and quantities. Nutrition always comes from our
  // versioned reference database before any deterministic rebalancing.
  const targets = {
    calorieGoal: params.calorie_goal,
    proteinGoal: params.protein_goal,
    carbsGoal: params.carbs_goal,
    fatGoal: params.fat_goal,
    allergies: Array.isArray(params.allergies) ? params.allergies : [],
  }
  const fitted = fitAthenaNutritionDayToTargets(parsed, targets)
  return validateAthenaNutritionDay(fitted, targets)
}

function generationFailureCode(error: unknown): string {
  if (error instanceof NutritionProviderOutputError) return error.code
  if (error instanceof AthenaNutritionOutputError) return error.code
  if (error instanceof SyntaxError) return 'invalid_json'
  if (error instanceof Error && error.message.startsWith('Anthropic ')) return 'provider'
  if (error instanceof Error && error.message.startsWith('No JSON')) return 'missing_json'
  return 'unknown'
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

  // DB-backed hourly rate limit (Sprint 3)
  const aiRl = await checkAiRateLimit(supabaseAuth, user.id, 'generate-meal-plan')
  if (!aiRl.allowed) return aiRateLimitResponse(aiRl.limit, aiRl.resetIn)
  // Monthly quota (cadrage coût vague beta)
  const aiQ = await checkAiQuota(supabaseAuth, user.id)
  if (!aiQ.allowed) return aiQuotaResponse(aiQ.limit, aiQ.resetIn)
  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Service temporairement indisponible' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
    }

    const parsedRequest = athenaNutritionRequestSchema.safeParse(await req.json().catch(() => null))
    if (!parsedRequest.success) {
      return new Response(JSON.stringify({ error: 'Requête invalide' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const params = parsedRequest.data

    // Coach-managed capabilities do not include AI meal-plan generation.
    const userId = user.id
    const blocked = await guardCoachManagedCapabilities(userId)
    if (blocked) return blocked
    const clientContext = await loadAthenaGenerationContext(supabaseAuth, userId)
    if (!clientContext.ok) {
      return new Response(JSON.stringify({ error: 'Profil temporairement indisponible' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
    }
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const plan: Record<string, any> = {}
        const outcomes = await mapWithConcurrency(DAYS, GENERATION_CONCURRENCY, async (day, index) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', day, index: index + 1, total: 7 })}\n\n`))
          let legacyDay: any = null
          let lastFailureCode = 'unknown'
          for (let attempt = 1; attempt <= 2 && !legacyDay; attempt++) {
            try {
              legacyDay = await generateOneDay(apiKey, day, params, [], clientContext.prompt, attempt === 2)
            } catch (error) {
              lastFailureCode = generationFailureCode(error)
              console.warn(`[meal-plan] generation attempt rejected day=${day} attempt=${attempt} code=${lastFailureCode}`)
            }
          }
          return { day, legacyDay, lastFailureCode }
        })

        for (const outcome of outcomes) {
          if (!outcome.legacyDay) {
            console.error(`[meal-plan] validated generation failed day=${outcome.day} code=${outcome.lastFailureCode}`)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Plan temporairement indisponible' })}\n\n`))
            controller.close()
            return
          }
          plan[outcome.day] = convertLegacyDayToCanonical(outcome.legacyDay)
        }

        if (params.persist_generated_plan) {
          const replacement = await replacePersonalMealPlan(supabaseAuth, user.id, plan)
          if (!replacement.ok) {
            console.error(`[meal-plan] persistence failed stage=${replacement.stage}`)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Sauvegarde temporairement indisponible' })}\n\n`))
            controller.close()
            return
          }
          console.info('[meal-plan] generation persisted days=7')
        }
        await logAiUsage(supabaseAuth, user.id, 'generate-meal-plan')
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', plan })}\n\n`))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })
  } catch {
    console.error('[generate-meal-plan] unexpected failure')
    return new Response(JSON.stringify({ error: 'Service temporairement indisponible' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
  }
}
