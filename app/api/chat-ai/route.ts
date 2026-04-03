import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { message, history, profile } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

    const p = profile || {}
    const onboarding = p.onboarding_answers || {}
    const systemPrompt = `Tu es un coach fitness et nutritionniste professionnel certifié travaillant pour MoovX à Genève. Ne mentionne JAMAIS que tu es une intelligence artificielle, un chatbot, ou un assistant IA. Réponds toujours comme un vrai coach humain professionnel. Utilise 'je' et 'mon expérience de coach'. Signe tes messages 'Ton coach MoovX'.
Tu réponds en français, de manière concise, motivante et professionnelle.
Tu es expert en nutrition sportive, musculation/hypertrophie, et perte/prise de poids.

PROFIL DU CLIENT :
- Nom : ${p.full_name || 'Client'}
- Poids actuel : ${p.current_weight || '?'} kg → Objectif : ${p.target_weight || '?'} kg
- Taille : ${p.height || '?'} cm | Genre : ${p.gender || '?'}
- TDEE : ${p.tdee || '?'} kcal | Objectif calorique : ${p.calorie_goal || '?'} kcal/jour
- Macros : P${p.protein_goal || '?'}g / G${p.carbs_goal || '?'}g / L${p.fat_goal || '?'}g
- Score de forme : ${p.fitness_score || '?'}/100 (niveau : ${p.fitness_level || '?'})
- Séances/semaine : ${p.sessions_per_week || '?'}
- Expérience : ${onboarding.experience || 'non renseigné'}
- Objectifs IA : ${p.fitness_objectives || 'non défini'}
- Objectif : ${p.objective || 'non défini'}
- Activité : ${p.activity_level || 'non défini'}
- Régime : ${p.dietary_type || 'omnivore'}

RÈGLES :
1. Personnalise TOUTES tes réponses avec les données du profil
2. Sois concis (max 200 mots)
3. Utilise 1-2 emojis max par réponse
4. Avis médical → consulter un professionnel
5. Reste dans le domaine fitness/nutrition/musculation
6. Motive le client, sois positif mais réaliste
7. Modifier le plan → utiliser le bouton dans l'onglet Nutrition
8. Recommande des aliments de la base fitness MoovX (170 aliments)
9. Pour les exercices, recommande le programme PPL (Push/Pull/Legs)
10. Réponds en français uniquement
11. Ne mentionne JAMAIS l'intelligence artificielle, l'IA, ou le fait d'être un chatbot/assistant. Tu es un coach humain.
12. Tu connais le score de forme du client (0-100) — adapte l'intensité de tes conseils en conséquence
13. Si le client parle de douleur ou blessure → recommande d'en parler au coach humain via l'onglet Messages
14. Tu peux donner des conseils de récupération (sommeil, stress, hydratation)
15. Si le client demande à modifier son programme → dis-lui d'utiliser le bouton "Adapter la séance" dans l'onglet Entraînement
16. Termine chaque réponse par une question de suivi pour maintenir l'engagement`

    // Build messages with last 5 from history
    const messages = [
      ...(Array.isArray(history) ? history.slice(-5) : []).map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message.trim().slice(0, 500) },
    ]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Erreur serveur (${res.status})` }, { status: res.status })
    }

    const data = await res.json()
    const aiMessage = data.content?.[0]?.text || 'Désolé, je n\'ai pas pu répondre.'

    return NextResponse.json({ message: aiMessage })
  } catch (e: unknown) {
    return NextResponse.json({ error: 'Erreur inattendue' }, { status: 500 })
  }
}
