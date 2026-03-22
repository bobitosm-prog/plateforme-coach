import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_ANTHROPIC_API_KEY manquante' }, { status: 500 })
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
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error('[generate-meal-plan] Anthropic error:', anthropicRes.status, err)
      return NextResponse.json({ error: `Erreur API (${anthropicRes.status})` }, { status: anthropicRes.status })
    }

    const data = await anthropicRes.json()
    const rawText = data.content[0].text

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    const parsed = JSON.parse(jsonMatch[0])

    // Ensure all 7 days present
    for (const d of DAYS) {
      if (!parsed[d]) parsed[d] = { total_kcal: 0, total_protein: 0, total_carbs: 0, total_fat: 0, repas: {} }
    }

    return NextResponse.json({ plan: parsed })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[generate-meal-plan] Error:', message)
    return NextResponse.json({ error: 'Erreur inattendue', detail: message }, { status: 500 })
  }
}
