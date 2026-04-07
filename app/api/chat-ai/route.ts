import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../lib/rate-limit'
import { COACH_SYSTEM_PROMPT } from '../../../lib/coach-knowledge'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`chat:${ip}`, 15, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) return NextResponse.json({ error: 'API key manquante' }, { status: 500 })

    const { message, history, profile } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

    const p = profile || {}
    const onboarding = p.onboarding_answers || {}
    const systemPrompt = `${COACH_SYSTEM_PROMPT}

PROFIL DU CLIENT :
- Nom : ${p.full_name || 'Client'}
- Poids : ${p.current_weight || '?'}kg → Objectif : ${p.target_weight || '?'}kg
- Taille : ${p.height || '?'}cm | Genre : ${p.gender || '?'}
- TDEE : ${p.tdee || '?'} kcal | Objectif calorique : ${p.calorie_goal || '?'} kcal/jour
- Macros : P${p.protein_goal || '?'}g / G${p.carbs_goal || '?'}g / L${p.fat_goal || '?'}g
- Niveau : ${p.fitness_level || '?'} (score ${p.fitness_score || '?'}/100)
- Objectif : ${p.objective || 'non defini'}
- Activite : ${p.activity_level || 'non defini'}
- Regime : ${p.dietary_type || 'omnivore'}
- Experience : ${onboarding.experience || 'non renseigne'}

REGLES : personnalise avec le profil, sois concis (max 200 mots), 1-2 emojis max, ne mentionne JAMAIS l'IA. Signe 'Ton coach MoovX'.
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
