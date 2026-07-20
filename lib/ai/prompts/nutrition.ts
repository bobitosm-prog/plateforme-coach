import { immutableInvocation, type AiPromptInvocation } from './types'

export function buildRecipeInvocation(input: {
  category?: string; calorieGoal?: number; proteinGoal?: number; dietaryType?: string
  foodsList?: string; includeIngredients?: readonly string[]; excludeIngredients?: readonly string[]
}): AiPromptInvocation {
  const category = input.category || 'dejeuner'
  const targetCalPerMeal = Math.round((input.calorieGoal || 2000) / 4)
  const targetProtPerMeal = Math.round((input.proteinGoal || 130) / 4)
  const system = `Tu es un chef cuisinier certifié spécialisé en nutrition sportive et fitness. Ne mentionne jamais l'intelligence artificielle dans tes réponses. Génère UNE recette.

PROFIL DU CLIENT :
- Calories par repas : ~${targetCalPerMeal} kcal
- Protéines par repas : ~${targetProtPerMeal}g
- Régime : ${input.dietaryType || 'omnivore'}

RÈGLES :
1. Utilise des aliments de cette liste fitness : ${input.foodsList || 'aliments fitness classiques'}
2. Recette simple : max 8 ingrédients, max 30 min de préparation
3. Quantités en grammes
4. Catégorie : ${category}
5. ${input.includeIngredients?.length ? 'INCLURE : ' + input.includeIngredients.join(', ') : ''}
6. ${input.excludeIngredients?.length ? 'ÉVITER : ' + input.excludeIngredients.join(', ') : ''}
7. La recette doit être DÉLICIEUSE, simple, et fitness-friendly
8. Calcule les macros de chaque ingrédient : kcal = (kcal_100g / 100) × quantite_g

Réponds UNIQUEMENT en JSON (pas de backticks, pas de texte) :
{
  "title": "Nom de la recette",
  "description": "Description courte appétissante (1 phrase)",
  "category": "${category}",
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
  const user = `Génère une recette ${category} fitness.${input.includeIngredients?.length ? ' Avec : ' + input.includeIngredients.join(', ') : ''}`
  return immutableInvocation({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, system, messages: [{ role: 'user', content: user }] })
}

export function buildMealPhotoInvocation(base64Data: string): AiPromptInvocation {
  return immutableInvocation({
    model: 'claude-sonnet-4-6', max_tokens: 1000,
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Data } },
      { type: 'text', text: `Analyse cette photo de repas. Identifie chaque aliment visible avec une estimation des quantites.

Reponds UNIQUEMENT en JSON valide, sans markdown :
{
  "foods": [
    { "name": "Nom en francais", "quantity_g": estimation, "calories": kcal, "proteins": g, "carbs": g, "fats": g }
  ],
  "total_calories": total,
  "confidence": "high" ou "medium" ou "low"
}` },
    ] }],
  })
}
