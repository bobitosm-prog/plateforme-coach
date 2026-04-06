import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../lib/rate-limit'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`recipe:${ip}`, 10, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { category, profile, foodsList, includeIngredients, excludeIngredients } = await req.json()

    const targetCalPerMeal = Math.round((profile?.calorie_goal || 2000) / 4)
    const targetProtPerMeal = Math.round((profile?.protein_goal || 130) / 4)

    const systemPrompt = `Tu es un chef cuisinier certifié spécialisé en nutrition sportive et fitness. Ne mentionne jamais l'intelligence artificielle dans tes réponses. Génère UNE recette.

PROFIL DU CLIENT :
- Calories par repas : ~${targetCalPerMeal} kcal
- Protéines par repas : ~${targetProtPerMeal}g
- Régime : ${profile?.dietary_type || 'omnivore'}

RÈGLES :
1. Utilise des aliments de cette liste fitness : ${foodsList || 'aliments fitness classiques'}
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

    const recipe = JSON.parse(match[0])
    // Round numeric values
    recipe.calories_per_serving = Math.round(recipe.calories_per_serving || 0)
    recipe.proteins_per_serving = Math.round((recipe.proteins_per_serving || 0) * 10) / 10
    recipe.carbs_per_serving = Math.round((recipe.carbs_per_serving || 0) * 10) / 10
    recipe.fat_per_serving = Math.round((recipe.fat_per_serving || 0) * 10) / 10

    return NextResponse.json({ recipe })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur inattendue' }, { status: 500 })
  }
}
