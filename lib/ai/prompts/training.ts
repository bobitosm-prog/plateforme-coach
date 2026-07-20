import { EXERCISE_SWAP_PROMPT, PROGRAM_GENERATION_PROMPT } from '../../coach-knowledge'
import { immutableInvocation, type AiPromptInvocation } from './types'

export function buildExerciseSwapInvocation(input: { exerciseName: string; reason?: string; muscleGroup?: string; availableEquipment?: string; isIsolation?: boolean }): AiPromptInvocation {
  const typeHint = input.isIsolation === true ? `IMPORTANT : "${input.exerciseName}" est un exercice d'ISOLATION. Propose UNIQUEMENT d'autres exercices d'isolation pour le meme groupe musculaire.`
    : input.isIsolation === false ? `IMPORTANT : "${input.exerciseName}" est un exercice COMPOSE. Propose UNIQUEMENT d'autres exercices composes.` : ''
  const content = `L'utilisateur veut remplacer l'exercice "${input.exerciseName}" (muscle: ${input.muscleGroup || 'non specifie'}).
Raison : ${input.reason || 'non specifiee'}
${input.availableEquipment ? `Materiel disponible : ${input.availableEquipment}` : ''}
${typeHint}

Propose exactement 3 alternatives en francais. Pour chaque alternative, donne :
- nom de l'exercice
- muscles cibles
- pourquoi c'est un bon remplacement
- niveau de difficulte (debutant/intermediaire/avance)

Reponds UNIQUEMENT en JSON valide :
[{"name": "...", "muscles": "...", "reason": "...", "difficulty": "..."}]`
  return immutableInvocation({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, system: EXERCISE_SWAP_PROMPT, messages: [{ role: 'user', content }] })
}

export interface AdaptWorkoutExercise { name?: unknown; exercise_name?: unknown; sets?: unknown; reps?: unknown }
export function buildAdaptWorkoutInvocation(input: { exercises: readonly AdaptWorkoutExercise[]; availableMinutes: unknown; sessionType?: string }): AiPromptInvocation {
  const summarized = input.exercises.map(e => ({ name: e.name || e.exercise_name, sets: e.sets, reps: e.reps }))
  const content = `Le client a seulement ${input.availableMinutes} minutes pour sa seance de ${input.sessionType || 'musculation'}.
Programme complet prévu : ${JSON.stringify(summarized)}

Adapte le programme pour ${input.availableMinutes} minutes :
- Garde les exercices composés en priorité
- Réduis le nombre de séries si nécessaire
- Supprime les exercices d'isolation moins importants

Réponds UNIQUEMENT en JSON valide :
[{"name": "...", "sets": N, "reps": "...", "rest_seconds": N, "priority": "haute/moyenne", "kept": true/false}]`
  return immutableInvocation({ model: 'claude-sonnet-4-6', max_tokens: 800, system: PROGRAM_GENERATION_PROMPT, messages: [{ role: 'user', content }] })
}

export function buildExerciseInstructionsInvocation(input: { name: string; muscleGroup?: string | null; equipment?: string | null }): AiPromptInvocation {
  const content = `Tu es un coach musculation expert. Pour l'exercice "${input.name}" (groupe: ${input.muscleGroup || '?'}, équipement: ${input.equipment || '?'}), donne en français :
1. EXÉCUTION : 3-4 phrases décrivant comment faire le mouvement correctement (position de départ, mouvement, retour)
2. CONSEILS : 2-3 conseils clés pour une bonne exécution (erreurs à éviter, respiration, tempo)

Réponds UNIQUEMENT en JSON :
{"instructions": "...", "tips": "..."}`
  return immutableInvocation({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages: [{ role: 'user', content }] })
}

export function buildOverloadInvocation(input: { exerciseName: string; currentWeight: number; currentReps: number; setsCompleted: number; historyLines: string }): AiPromptInvocation {
  const system = `Tu es un coach fitness expert en progressive overload.
Tu réponds UNIQUEMENT en JSON valide, aucun texte avant ou après.
Format strict : {"weight": number, "reps": number, "reasoning": string}`
  const content = `Le client vient de finir ${input.setsCompleted}x${input.currentReps}@${input.currentWeight}kg sur l'exercice '${input.exerciseName}', toutes séries réussies.

Historique des dernières séances (récent → ancien) :
${input.historyLines || 'Aucun historique disponible (première séance)'}

Règles de progression :
- Exos composés lourds (squat, bench press, deadlift, overhead press, row) : +2.5 à +5kg
- Exos isolation moyens (leg curl, leg extension, lat pulldown) : +2.5kg
- Exos petits muscles isolation (curl biceps, lateral raise, tricep extension, face pull) : +1.25 à +2.5kg
- Si l'historique montre une stagnation (3+ séances même poids réussies) : pousser plus haut (+5kg composé, +2.5kg isolation)
- Si la progression est récente (1 séance réussie seulement) : prudent (+2.5kg max composé, +1.25kg isolation)
- Garder le même nombre de reps cibles

Suggère la prochaine charge. Reasoning concis (max 100 chars), français, ton motivant.`
  return immutableInvocation({ model: 'claude-haiku-4-5-20251001', max_tokens: 300, temperature: 0.3, system, messages: [{ role: 'user', content }] })
}

export function buildLegacyCoachProgramInvocation(input: {
  objective: unknown; weight: unknown; targetWeight: unknown; level: unknown; equipment: readonly unknown[]
  days: number; splitGuide: string; prefatigueInstructions: string
}): AiPromptInvocation {
  const content = `${PROGRAM_GENERATION_PROMPT}

${input.prefatigueInstructions}

Client: objectif=${input.objective}, poids=${input.weight}kg, cible=${input.targetWeight}kg, niveau=${input.level}, equipement=${input.equipment.join(',')}, ${input.days} jours/semaine

SPLIT RECOMMANDE :
${input.splitGuide}

RÈGLES HYPERTROPHIE :
- Rep range : 8-12 reps exercices composés, 10-15 reps isolation
- Sets : 3-4 par exercice
- Temps de repos : 60-90s isolation, 90-120s composés
- 4-6 exercices par séance
- Volume : 15-20 sets par groupe musculaire par semaine
- Adapte les exercices au niveau du client et à son équipement

Réponds avec SEULEMENT ce JSON (pas de texte avant ou après):
{
  "lundi": {"isRest": false, "day_name": "Push A", "exercises": [{"name": "Développé couché barre", "sets": 4, "reps": 10, "rest_seconds": 90, "notes": ""}]},
  "mardi": {"isRest": false, "day_name": "Pull A", "exercises": [...]},
  "mercredi": {"isRest": false, "day_name": "Legs A", "exercises": [...]},
  "jeudi": {"isRest": false, "day_name": "Push B", "exercises": [...]},
  "vendredi": {"isRest": false, "day_name": "Pull B", "exercises": [...]},
  "samedi": {"isRest": false, "day_name": "Legs B", "exercises": [...]},
  "dimanche": {"isRest": true, "day_name": "Repos", "exercises": []}
}

IMPORTANT :
- Génère exactement ${input.days} jours d'entraînement et ${7 - input.days} jours de repos
- Chaque jour doit avoir un "day_name" descriptif (ex: "Push A", "Full Body A", "Upper A")
- Les exercices doivent être réalistes et adaptés au niveau ${input.level}
- Varie les exercices entre les sessions A et B pour le même groupe musculaire
- Le champ rest_seconds DOIT être un nombre entier représentant des secondes (ex: 90, 120, 180), JAMAIS une string avec suffixe`
  return immutableInvocation({ model: 'claude-haiku-4-5-20251001', max_tokens: 3000, messages: [{ role: 'user', content }] })
}
