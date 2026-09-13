/**
 * Core program generation logic — pure function, no auth/request dependency.
 * Used by the API endpoint (generate-custom-program) and the cron (F6.B.6).
 */
import { unwrapToolInput } from '../anthropic/unwrap-tool-input'
import { PROGRAM_GENERATION_PROMPT } from '../coach-knowledge'
import { findExerciseMatch } from '../exercise-matching'
import { buildAthenaTrainingPolicyPrompt, normalizeAthenaTrainingRequest } from '../athena/training-policy'

export interface GenerateProgramInput {
  objective: string
  level: string
  daysPerWeek: number
  duration: number
  equipment: string
  priorities: string[]
  notes: string
  gender: string
}

interface GeneratedExercise extends Record<string, unknown> {
  custom_name: string
  exercise_id?: string | null
}

interface GeneratedProgramDay extends Record<string, unknown> {
  exercises: GeneratedExercise[]
}

export interface GeneratedProgram extends Record<string, unknown> {
  program_name: string
  description: string
  days: GeneratedProgramDay[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// `gender` remains in the transport type for backwards compatibility, but is
// deliberately not used to assign stereotyped training priorities.

/**
 * Generate a training program via Anthropic tool_use.
 * Pure function: no auth, no request, no rate-limit.
 * Throws on error (caller handles).
 */
export async function generateProgram(input: GenerateProgramInput, apiKey: string, catalog: { id: string; name: string }[] = []): Promise<GeneratedProgram> {
  const request = normalizeAthenaTrainingRequest({
    objective: input.objective,
    level: input.level,
    daysPerWeek: input.daysPerWeek,
    durationMinutes: input.duration,
    equipment: input.equipment,
    priorities: input.priorities,
    notes: input.notes,
  })
  const days = request.daysPerWeek

  const systemPrompt = `${PROGRAM_GENERATION_PROMPT}

${buildAthenaTrainingPolicyPrompt({
    objective: input.objective,
    level: input.level,
    daysPerWeek: input.daysPerWeek,
    durationMinutes: input.duration,
    equipment: input.equipment,
    priorities: input.priorities,
    notes: input.notes,
  })}

${catalog.length > 0 ? `
RÉFÉRENTIEL D'EXERCICES (${catalog.length} exercices) :
Choisis le nom de chaque exercice EXACTEMENT dans cette liste quand le mouvement y figure.
N'invente pas de variante orthographique (accents, pluriels, casse).
Si un mouvement n'existe pas dans la liste, nomme-le clairement.
${catalog.map(c => c.name).join(', ')}
` : ''}
Reponds UNIQUEMENT avec du JSON valide, aucun texte avant ou apres.`

  const userPrompt = `Génère le programme correspondant exactement à la demande normalisée du contrat Athena.

JSON obligatoire :
{
  "program_name": "string",
  "description": "string",
  "days": [
    {
      "day_number": 1,
      "name": "PUSH A — Poitrine & Epaules & Triceps",
      "focus": "Poitrine, Epaules, Triceps",
      "muscle_groups": ["chest", "shoulders", "triceps"],
      "exercises": [
        {
          "custom_name": "Développé couché barre",
          "muscle_primary": "Poitrine",
          "sets": 4,
          "reps": 8,
          "rest_seconds": 120,
          "order": 1,
          "tempo": "2-0-2",
          "technique": null,
          "technique_details": ""
        }
      ]
    }
  ]
}

IMPORTANT :
- Exactement ${days} jours
- Respecte la plage d'exercices par séance définie dans le contrat
- Suis le split suggéré, sauf justification explicite plus adaptée dans la description
- Chaque exercice a un order (1, 2, 3...), sets, reps, rest_seconds
- muscle_groups utilise des IDs anglais : chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, core, abs
- Chaque exercice a un tempo (format "X-X-X"), technique (null ou "dropset"/"restpause"/"superset"/"mechanical"), et technique_details
- Pour les debutants : pas de techniques avancees, tempo "2-0-2" partout
- Pour les intermediaires : max 1 technique optionnelle par jour
- Pour les avances : max 2 techniques optionnelles par jour`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 8000,
      system: systemPrompt,
      tool_choice: { type: 'tool', name: 'generate_program' },
      tools: [{
        name: 'generate_program',
        description: 'Structure le programme d\'entrainement genere en JSON exploitable',
        input_schema: {
          type: 'object',
          required: ['program_name', 'description', 'days'],
          properties: {
            program_name: { type: 'string', description: 'Nom du programme' },
            description: { type: 'string', description: 'Description courte du programme et de sa logique' },
            days: {
              type: 'array',
              description: 'Liste des jours d\'entrainement',
              minItems: days,
              maxItems: days,
              items: {
                type: 'object',
                required: ['day_number', 'name', 'focus', 'muscle_groups', 'exercises'],
                properties: {
                  day_number: { type: 'integer', description: 'Numero du jour (1, 2, 3...)' },
                  name: { type: 'string', description: 'Nom du jour (ex: PUSH A — Poitrine & Epaules & Triceps)' },
                  focus: { type: 'string', description: 'Groupes musculaires cibles en texte (ex: Poitrine, Epaules, Triceps)' },
                  muscle_groups: {
                    type: 'array',
                    items: { type: 'string', enum: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core', 'abs'] },
                    description: 'IDs anglais des groupes musculaires cibles',
                  },
                  exercises: {
                    type: 'array',
                    description: `${request.exercisesPerSession.min} a ${request.exercisesPerSession.max} exercices par jour`,
                    minItems: request.exercisesPerSession.min,
                    maxItems: request.exercisesPerSession.max,
                    items: {
                      type: 'object',
                      required: ['custom_name', 'muscle_primary', 'sets', 'reps', 'rest_seconds', 'order', 'tempo', 'technique', 'technique_details'],
                      properties: {
                        custom_name: { type: 'string', description: 'Nom de l\'exercice' },
                        muscle_primary: { type: 'string', description: 'Muscle principal travaille (en francais)' },
                        sets: { type: 'integer', minimum: 1, maximum: 4, description: 'Nombre de series' },
                        reps: { type: 'integer', minimum: 1, maximum: 30, description: 'Nombre de repetitions' },
                        rest_seconds: { type: 'integer', minimum: 30, maximum: 300, description: 'Temps de repos en secondes' },
                        order: { type: 'integer', description: 'Ordre de l\'exercice dans la seance (1, 2, 3...)' },
                        tempo: { type: 'string', description: 'Tempo format X-X-X (ex: 2-0-2)' },
                        technique: { type: ['string', 'null'], enum: ['dropset', 'restpause', 'superset', 'mechanical', null], description: 'Technique avancee ou null' },
                        technique_details: { type: 'string', description: 'Details de la technique ou chaine vide' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[generateProgram] Anthropic error:', res.status, err.slice(0, 200))
    throw new Error(`Anthropic ${res.status}`)
  }

  const json: unknown = await res.json()
  const content = isRecord(json) && Array.isArray(json.content) ? json.content : []
  const toolUseBlock = content.find(block => isRecord(block) && block.type === 'tool_use')
  if (!toolUseBlock) {
    console.error('[generateProgram] No tool_use in response:', JSON.stringify(json).slice(0, 500))
    throw new Error('Format IA invalide')
  }

  const program = unwrapToolInput<GeneratedProgram>(toolUseBlock.input)

  // Post-process: resolve exercise names against catalog + set exercise_id
  if (catalog.length > 0 && program?.days) {
    for (const day of program.days) {
      for (const ex of (day.exercises || [])) {
        const match = findExerciseMatch(catalog, ex.custom_name)
        if (match) {
          ex.custom_name = match.name
          ex.exercise_id = match.id
        } else {
          ex.exercise_id = null
        }
      }
    }
  }

  return program
}
