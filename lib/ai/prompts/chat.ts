import { COACH_SYSTEM_PROMPT } from '../../coach-knowledge'
import { immutableInvocation, type AiPromptInvocation } from './types'

export interface AthenaPromptProfile {
  full_name?: string | null; current_weight?: number | null; target_weight?: number | null; height?: number | null
  gender?: string | null; tdee?: number | null; calorie_goal?: number | null; protein_goal?: number | null
  carbs_goal?: number | null; fat_goal?: number | null; fitness_level?: string | null; fitness_score?: number | null
  objective?: string | null; activity_level?: string | null; dietary_type?: string | null; onboarding_answers?: unknown
}

export function buildAthenaInvocation(profile: AthenaPromptProfile, history: readonly { role: 'user' | 'assistant'; content: string }[], message: string): AiPromptInvocation {
  const onboarding = profile.onboarding_answers && typeof profile.onboarding_answers === 'object'
    ? profile.onboarding_answers as Record<string, unknown> : {}
  const system = `${COACH_SYSTEM_PROMPT}

PROFIL DU CLIENT :
- Nom : ${profile.full_name || 'Client'}
- Poids : ${profile.current_weight || '?'}kg → Objectif : ${profile.target_weight || '?'}kg
- Taille : ${profile.height || '?'}cm | Genre : ${profile.gender || '?'}
- TDEE : ${profile.tdee || '?'} kcal | Objectif calorique : ${profile.calorie_goal || '?'} kcal/jour
- Macros : P${profile.protein_goal || '?'}g / G${profile.carbs_goal || '?'}g / L${profile.fat_goal || '?'}g
- Niveau : ${profile.fitness_level || '?'} (score ${profile.fitness_score || '?'}/100)
- Objectif : ${profile.objective || 'non defini'}
- Activite : ${profile.activity_level || 'non defini'}
- Regime : ${profile.dietary_type || 'omnivore'}
- Experience : ${onboarding.experience || 'non renseigne'}

REGLES : personnalise avec le profil, sois concis (max 200 mots), 1-2 emojis max, ne mentionne JAMAIS l'IA. Signe 'Ton coach MoovX'.
12. Tu connais le score de forme du client (0-100) — adapte l'intensité de tes conseils en conséquence
13. Si le client parle de douleur ou blessure → recommande d'en parler au coach humain via l'onglet Messages
14. Tu peux donner des conseils de récupération (sommeil, stress, hydratation)
15. Si le client demande à modifier son programme → dis-lui d'utiliser le bouton "Adapter la séance" dans l'onglet Entraînement
16. Termine chaque réponse par une question de suivi pour maintenir l'engagement`
  return immutableInvocation({ model: 'claude-sonnet-4-6', max_tokens: 1024, system, messages: [...history.map(item => ({ ...item })), { role: 'user', content: message }] })
}
