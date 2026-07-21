import { NUTRITION_GENERATION_PROMPT } from '../../coach-knowledge'
import { formatFitnessFoodsForPrompt } from '../../fitness-food-database'
import type { MealGenerationDayInvocation, MealGenerationParams } from '../../nutrition/meal-generation/types'

export function buildMealGenerationSystemPrompt(params: MealGenerationParams) {
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
- Déjeuner : TOUJOURS inclure une VIANDE ou POISSON comme plat principal (poulet, boeuf, dinde, saumon, thon). Ajuste la quantité pour ATTEINDRE la cible protéique du repas (~${dejP}g), PAS plus.
- Collation : whey, yaourt grec, fromage blanc, amandes, oeufs
- Dîner : TOUJOURS inclure une VIANDE ou POISSON DIFFÉRENTE du déjeuner (si poulet au déj → poisson ou boeuf au dîner). Ajuste la quantité pour ~${dinP}g de protéines.
IMPORTANT : Ne dépasse PAS la cible protéique globale de ${prot}g — c'est aussi important que les calories.`

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
${params.scanned_foods.map((f) => `- ${f.name}${f.brand ? ' (' + f.brand + ')' : ''}: ${f.calories}kcal, P${f.proteins}g, G${f.carbs}g, L${f.fat}g /100g`).join('\n')}
Complète avec les aliments fitness de base si nécessaire.
` : ''}
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
- N'écris JAMAIS 'cru' dans le nom d'un aliment. Écris 'Riz basmati', pas 'Riz basmati (cru)'.
- Utilise les valeurs nutritionnelles du CUIT : riz/pâtes cuits ≈ 130 kcal/100g et ~28g de glucides/100g (PAS 350 kcal/100g qui correspond au cru).
- Lentilles/légumineuses cuites ≈ 115-130 kcal/100g.
- Les viandes, poissons, œufs : poids cuit également.
- Légumes, fruits, produits laitiers : poids tels quels (déjà consommables).

VÉRIFICATION OBLIGATOIRE avant de retourner le JSON :
- Additionne les kcal de tous les aliments de la journée
- Si total < ${kcal - 50} : augmente les portions de féculents (+30-50g), ajoute huile d'olive (10g = 88 kcal)
- Si total > ${kcal + 50} : réduis les portions de féculents (-20-30g)
- Le total FINAL doit être entre ${kcal - 50} et ${kcal + 50}
- Additionne les protéines totales : si > ${Math.round(prot * 1.1)}g, RÉDUIS les portions de viande/poisson/protéines. Si < ${Math.round(prot * 0.9)}g, augmente-les.
- Additionne les glucides : si < ${Math.round(carbs * 0.9)}g, AUGMENTE les féculents/fruits. Si > ${Math.round(carbs * 1.1)}g, réduis-les.
- Additionne les lipides : si > ${Math.round(fat * 1.1)}g, réduis huiles/fromages/oléagineux.

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

export function buildSequentialMealDayInvocation(day: string, params: MealGenerationParams, proteinsUsed: readonly string[]): MealGenerationDayInvocation {
  const kcal = params.calorie_goal || 2500
  const proteinHint = proteinsUsed.length > 0 ? `\nProtéines déjà utilisées les jours précédents (VARIE !) : ${proteinsUsed.join(', ')}` : ''
  const foodListStr = (params.available_foods || []).map(f => `${f.nom} (${f.kcal}kcal, P${f.p} G${f.g} L${f.l} /100g)`).join('\n')
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
    : objMode === 'bulk' ? `Rappel objectif : BULK — surplus de +${caloricAdj} kcal vs TDEE. Portions généreuses, glucides élevés.`
    : `Rappel objectif : MAINTIEN — calories = TDEE.`
  const user = `Génère le plan pour ${day.toUpperCase()}.

${objReminder}

OBJECTIFS STRICTS : ${kcal} kcal (±50 MAX), Protéines ${params.protein_goal}g (max ${Math.round((params.protein_goal || 150) * 1.1)}g), Glucides ${params.carbs_goal}g (min ${Math.round((params.carbs_goal || 250) * 0.9)}g), Lipides ${params.fat_goal}g (max ${Math.round((params.fat_goal || 70) * 1.1)}g)
Allergènes : ${(params.allergies || []).join(', ') || 'aucun'}
${params.disliked_foods?.length ? `Aliments à ÉVITER (le client n'aime pas) : ${params.disliked_foods.join(', ')}` : ''}

${prefHint ? `PRÉFÉRENCES DU CLIENT :\n${prefHint}\nUtilise ces aliments en VARIANT chaque jour. Ne répète PAS le même petit-déjeuner 2 jours de suite.\n` : ''}ALIMENTS DISPONIBLES (valeurs /100g) :
${foodListStr || 'Utilise des aliments fitness classiques.'}
${proteinHint}

VARIÉTÉ : ce jour doit être DIFFÉRENT des précédents. 7 petits-déj différents, 7 déjeuners différents, 7 dîners différents.
Déjeuner et dîner : protéine animale/principale OBLIGATOIRE (quantité ajustée aux macros cibles du repas).
${params.scanned_foods?.length ? `\nAliments prioritaires du client : ${params.scanned_foods.slice(0, 10).map(f => f.name).join(', ')}` : ''}
Aliments féculents (riz, pâtes, légumineuses) : TOUJOURS pesés et calculés CUITS (~130 kcal/100g pour riz/pâtes), jamais crus.
TOTAL KCAL de ce jour : entre ${kcal - 50} et ${kcal + 50}. Réponds UNIQUEMENT en JSON.`
  return Object.freeze({ maxTokens: 1500, system: buildMealGenerationSystemPrompt(params), user })
}
