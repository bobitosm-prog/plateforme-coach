import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key manquante' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const {
      calorie_goal, protein_goal, carbs_goal, fat_goal,
      dietary_type, allergies, liked_foods_names, objective,
    } = await req.json()

    const systemPrompt = `Tu es un nutritionniste expert en fitness. Tu génères des plans alimentaires précis avec des aliments cuits, en grammes exacts.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour.`

    const userPrompt = `Génère un plan alimentaire pour 7 jours avec ces paramètres :
- Calories cibles : ${calorie_goal} kcal/jour
- Protéines : ${protein_goal}g | Glucides : ${carbs_goal}g | Lipides : ${fat_goal}g
- Régime : ${dietary_type || 'omnivore'}
- Allergènes à éviter : ${(allergies || []).join(', ') || 'aucun'}
- Aliments préférés (utilise en priorité) : ${(liked_foods_names || []).join(', ') || 'aucune préférence'}
- Objectif : ${objective || 'maintenance'}

Format JSON attendu :
{
  "lundi": {
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
  }
}

Règles importantes :
- Toujours indiquer les aliments CUITS (ex: "Riz basmati cuit" pas "Riz basmati")
- Quantités réalistes et précises (multiples de 5g)
- Varier les repas sur 7 jours
- Atteindre exactement les calories cibles ±50 kcal
- 4 repas par jour minimum (petit_dejeuner, dejeuner, collation, diner)
- Génère les 7 jours : lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error('[generate-meal-plan] Anthropic error:', anthropicRes.status, err)
      return new Response(JSON.stringify({ error: `Erreur API (${anthropicRes.status})` }), { status: anthropicRes.status, headers: { 'Content-Type': 'application/json' } })
    }

    // Stream-through: pass Anthropic's SSE stream directly to client
    return new Response(anthropicRes.body, {
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
