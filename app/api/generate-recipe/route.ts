import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit, logAiUsage } from '../../../lib/rate-limit'
import { loadEffectiveEntitlementContext } from '../../../lib/entitlements/server-context'
import { ATHENA_GENERATION_PROFILE_COLUMNS } from '../../../lib/athena/generation-context'
import { buildAthenaClientContext, formatAthenaClientContextForPrompt } from '../../../lib/athena/client-context'
import { buildAthenaScientificPolicyPrompt } from '../../../lib/athena/scientific-policy'
import { validateAthenaRecipe } from '../../../lib/athena/recipe-output'
import { formatFitnessFoodsForPrompt } from '../../../lib/fitness-food-database'

const text = z.string().trim().max(120)
const requestSchema = z.object({
  category: z.enum(['petit-dejeuner', 'dejeuner', 'collation', 'diner', 'smoothie']).default('dejeuner'),
  includeIngredients: z.array(text).max(8).default([]),
  excludeIngredients: z.array(text).max(20).default([]),
})

export async function POST(req: NextRequest) {
  // Auth check
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`recipe:${ip}`, 10, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const parsedRequest = requestSchema.safeParse(await req.json().catch(() => null))
    if (!parsedRequest.success) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    const { category, includeIngredients, excludeIngredients } = parsedRequest.data

    const { data: capabilityProfileData, error: capabilityError } = await supabase
      .from('profiles')
      .select(`subscription_type, ${ATHENA_GENERATION_PROFILE_COLUMNS}, allergies`)
      .eq('id', user.id)
      .maybeSingle()
    const capabilityProfile = capabilityProfileData as unknown as Record<string, unknown> | null
    if (capabilityError || !capabilityProfile) {
      return NextResponse.json({ error: 'Autorisation impossible' }, { status: 403 })
    }

    const { capabilities } = await loadEffectiveEntitlementContext(
      user.id,
      typeof capabilityProfile.subscription_type === 'string' ? capabilityProfile.subscription_type : null,
    )
    if (!capabilities.nutrition) {
      return NextResponse.json({ error: 'Fonctionnalité gérée par ton coach.' }, { status: 403 })
    }
    const clientContext = formatAthenaClientContextForPrompt(buildAthenaClientContext(capabilityProfile))

    const targetCalPerMeal = Math.round((Number(capabilityProfile.calorie_goal) || 2000) / 4)
    const targetProtPerMeal = Math.round((Number(capabilityProfile.protein_goal) || 130) / 4)

    const systemPrompt = `Tu es un chef cuisinier certifié spécialisé en nutrition sportive et fitness. Ne mentionne jamais l'intelligence artificielle dans tes réponses. Génère UNE recette.

PROFIL DU CLIENT :
- Calories par repas : ~${targetCalPerMeal} kcal
- Protéines par repas : ~${targetProtPerMeal}g
- Régime : ${typeof capabilityProfile.dietary_type === 'string' ? capabilityProfile.dietary_type : 'omnivore'}
- Allergies : ${Array.isArray(capabilityProfile.allergies) ? capabilityProfile.allergies.join(', ') : 'aucune'}

${buildAthenaScientificPolicyPrompt()}

${clientContext}

RÈGLES :
1. Utilise exclusivement les noms exacts de cette base : ${formatFitnessFoodsForPrompt()}
2. Recette simple : max 8 ingrédients, max 30 min de préparation
3. Quantités en grammes
4. Catégorie : ${category || 'dejeuner'}
5. ${includeIngredients?.length ? 'INCLURE : ' + includeIngredients.join(', ') : ''}
6. ${excludeIngredients?.length ? 'ÉVITER : ' + excludeIngredients.join(', ') : ''}
7. La recette doit être DÉLICIEUSE, simple, et fitness-friendly
8. Calcule les macros de chaque ingrédient : kcal = (kcal_100g / 100) × quantite_g

Réponds UNIQUEMENT en JSON (pas de backticks, pas de texte) :
{
  "title": "Nom de la recette",
  "description": "Description courte appétissante (1 phrase)",
  "category": "${category || 'dejeuner'}",
  "prep_time_min": 10,
  "cook_time_min": 15,
  "servings": 1,
  "ingredients": [
    {"name": "Blanc de poulet cuit", "quantity_g": 200, "calories": 330, "proteins": 62, "carbs": 0, "fat": 7}
  ],
  "instructions": [
    {"step": 1, "text": "Couper le poulet en morceaux."},
    {"step": 2, "text": "..."}
  ],
  "tags": ["high-protein", "quick"],
  "calories_per_serving": 500,
  "proteins_per_serving": 45,
  "carbs_per_serving": 50,
  "fat_per_serving": 12
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Génère une recette ${category || 'dejeuner'} fitness.${includeIngredients?.length ? ' Avec : ' + includeIngredients.join(', ') : ''}` }],
      }),
    })

    if (!res.ok) return NextResponse.json({ error: `Erreur serveur (${res.status})` }, { status: res.status })

    const data = await res.json()
    const raw = data.content?.[0]?.text || ''
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Pas de JSON dans la réponse' }, { status: 500 })

    const recipe = validateAthenaRecipe(JSON.parse(match[0]))
    await logAiUsage(supabase, user.id, 'generate-recipe')

    return NextResponse.json({ recipe })
  } catch {
    console.error('[generate-recipe] validated generation failed')
    return NextResponse.json({ error: 'Recette temporairement indisponible' }, { status: 500 })
  }
}
