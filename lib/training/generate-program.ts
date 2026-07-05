/**
 * Core program generation logic — pure function, no auth/request dependency.
 * Used by the API endpoint (generate-custom-program) and the cron (F6.B.6).
 */
import { getPrefatigueInstructions } from '../prefatigue-mapping'
import { unwrapToolInput } from '../anthropic/unwrap-tool-input'
import { PROGRAM_GENERATION_PROMPT } from '../coach-knowledge'
import { findExerciseMatch } from '../exercise-matching'

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

// ─── Program structures by days × gender ───

function getProgramStructure(days: number, isFemale: boolean): string {
  if (days <= 2) return `
STRUCTURE 2 JOURS — Full Body A / Full Body B :
Jour 1 - FULL BODY A : ${isFemale
  ? 'Squat, Hip thrust, Tirage vertical, Développé haltères, Leg curl, Abduction, Crunch'
  : 'Squat, Développé couché, Rowing barre, Développé militaire, Curl barre, Triceps poulie, Crunch'
}
Jour 2 - FULL BODY B : ${isFemale
  ? 'Romanian DL, Fente avant, Rowing machine, Élévations latérales, Kickbacks câble, Pont fessier, Planche'
  : 'Soulevé de terre, Développé incliné, Tractions/Tirage, Fentes, Curl marteau, Dips, Gainage'
}`

  if (days === 3) return isFemale ? `
STRUCTURE 3 JOURS FEMME — Upper / Lower / Glutes & Core :
Jour 1 - UPPER : Tirage vertical 4×10, Rowing machine 3×12, Développé haltères 3×12, Élévations latérales 3×15, Curl haltères 3×12, Triceps poulie 3×12
Jour 2 - LOWER : Squat 4×10, Romanian DL 4×10, Fente avant 3×12, Leg extension 3×15, Leg curl 3×12, Mollets 4×15
Jour 3 - GLUTES & CORE : Hip thrust 4×10, Kickbacks câble 3×15, Abduction machine 3×15, Sumo squat 3×12, Crunch câble 3×15, Planche 3×45s` : `
STRUCTURE 3 JOURS HOMME — Push / Pull / Legs :
Jour 1 - PUSH : Développé couché 4×8, Développé incliné haltères 3×10, Écarté câble 3×12, Développé militaire 3×10, Élévations latérales 3×15, Triceps poulie 3×12
Jour 2 - PULL : Tractions/Tirage vertical 4×8, Rowing barre 4×10, Rowing haltère 3×10, Face pulls 3×15, Curl barre 3×10, Curl marteau 3×12
Jour 3 - LEGS : Squat 4×8, Romanian DL 4×10, Leg press 3×12, Fente avant 3×12, Leg curl 3×12, Mollets 4×15`

  if (days === 4) return isFemale ? `
STRUCTURE 4 JOURS FEMME — Upper / Glutes-Ischio / Upper / Quads-Mollets :
Jour 1 - UPPER A : Tirage vertical 4×10, Rowing machine 3×12, Développé haltères 3×12, Élévations latérales 3×15, Face pulls 3×15, Curl haltères 3×12
Jour 2 - GLUTES & ISCHIO : Hip thrust barre 4×10, Romanian DL 4×10, Leg curl couché 3×12, Kickbacks câble 3×15, Abduction machine 3×15, Pont fessier 3×20
Jour 3 - UPPER B : Rowing haltère 3×12, Tirage serré 3×12, Développé incliné 3×12, Dips assistés 3×10, Triceps poulie 3×15, Crunch câble 3×15
Jour 4 - QUADS & MOLLETS : Squat 4×10, Leg press 4×12, Fente avant 3×12, Leg extension 3×15, Sumo squat 3×12, Mollets debout 4×15` : `
STRUCTURE 4 JOURS HOMME — Upper A / Lower Quads / Upper B / Lower Ischio :
Jour 1 - UPPER A : Développé couché 4×8, Rowing barre 4×8, Développé militaire 3×10, Tractions 3×max, Curl barre 3×10, Triceps poulie 3×12
Jour 2 - LOWER QUADS : Squat 4×8, Leg press 4×10, Fente avant 3×12, Leg extension 3×15, Mollets assis 4×15
Jour 3 - UPPER B : Développé incliné haltères 4×10, Tirage serré 4×10, Arnold press 3×10, Rowing câble 3×12, Curl marteau 3×12, Dips 3×max
Jour 4 - LOWER ISCHIO : Romanian DL 4×8, Leg curl couché 4×10, Fente bulgare 3×10, Hip thrust 3×12, Leg curl assis 3×12, Mollets debout 4×15`

  if (days === 5) return isFemale ? `
STRUCTURE 5 JOURS FEMME — Glutes A / Upper A / Glutes B / Quads / Upper & Core :
Jour 1 - GLUTES & ISCHIO A : Hip thrust barre 4×10, Romanian DL 4×10, Leg curl couché 3×12, Kickbacks câble 3×15, Abduction machine 3×15, Pont fessier 3×20
Jour 2 - UPPER A : Tirage vertical 4×10, Rowing machine 3×12, Développé haltères 3×12, Élévations latérales 3×15, Face pulls 3×15, Curl haltères 3×12
Jour 3 - GLUTES & ISCHIO B : Hip thrust unilatéral 4×12, Good morning 3×12, Fente bulgare 3×10, Abduction câble 3×20, Fesses à 45° 4×15, Soulevé de terre sumo 3×10
Jour 4 - LOWER QUADS : Squat 4×10, Leg press 4×12, Fente avant 3×12, Leg extension 3×15, Sumo squat 3×12, Mollets 4×15
Jour 5 - UPPER & CORE : Rowing haltère 3×12, Développé incliné 3×12, Dips assistés 3×10, Triceps poulie 3×15, Crunch câble 3×15, Planche 3×45s, Russian twist 3×20` : `
STRUCTURE 5 JOURS HOMME — Push / Pull / Legs Quads / Upper iso / Legs Ischio :
Jour 1 - PUSH : Développé couché 4×8, Développé incliné 3×10, Écarté câble 3×12, Développé militaire 3×10, Élévations latérales 3×15, Triceps poulie 3×12
Jour 2 - PULL : Tractions 4×8, Rowing barre 4×10, Rowing haltère 3×10, Face pulls 3×15, Curl barre 3×10, Curl marteau 3×12
Jour 3 - LEGS QUADS : Squat 4×8, Leg press 4×10, Fente avant 3×12, Leg extension 3×15, Mollets assis 4×15
Jour 4 - UPPER ISOLATIONS : Arnold press 3×10, Élévations frontales 3×12, Curl concentré 3×12, Triceps crâne 3×12, Dips 3×max, Shrugs 3×15
Jour 5 - LEGS ISCHIO : Romanian DL 4×8, Leg curl couché 4×10, Fente bulgare 3×10, Hip thrust 3×12, Mollets debout 4×15`

  // 6 days
  return isFemale ? `
STRUCTURE 6 JOURS FEMME :
Jour 1 - LOWER A (Fessiers & Ischio) : Hip thrust barre 4×10, Romanian DL 4×10, Leg curl couché 3×12, Kickbacks câble 3×15, Abduction machine 3×15, Pont fessier 3×20
Jour 2 - UPPER A (Dos & Épaules) : Tirage vertical 4×10, Rowing machine 3×12, Développé militaire haltères 3×12, Élévations latérales 3×15, Face pulls 3×15, Curl haltères 3×12
Jour 3 - LOWER B (Quads focus) : Squat 4×10, Leg press 4×12, Fente avant 3×12, Leg extension 3×15, Sumo squat haltère 3×12, Mollets 4×15
Jour 4 - UPPER B (Poitrine & Triceps & Core) : Développé haltères incliné 3×12, Écarté câble 3×15, Dips assistés 3×10, Triceps poulie 3×15, Crunch câble 3×15, Planche 3×45s
Jour 5 - GLUTES & CORE : Hip thrust unilatéral 4×12, Fesses à 45° 4×15, Abduction câble debout 3×20, Good morning 3×12, Gainage dynamique 3×30s, Russian twist 3×20
Jour 6 - FULL BODY (volume léger) : Goblet squat 3×15, Romanian DL haltères 3×12, Rowing haltère 3×12, Développé épaules 3×12, Hip thrust poids corps 3×20, Crunch 3×20` : `
STRUCTURE 6 JOURS HOMME — PPL × 2 :
Jour 1 - PUSH A : Développé couché 4×8, Développé incliné 3×10, Écarté câble 3×12, Développé militaire 3×10, Élévations latérales 3×15, Triceps poulie 3×12
Jour 2 - PULL A : Tractions/Tirage 4×8, Rowing barre 4×10, Rowing haltère 3×10, Face pulls 3×15, Curl barre 3×10, Curl marteau 3×12
Jour 3 - LEGS QUADS : Squat 4×8, Leg press 4×10, Fente avant 3×12, Leg extension 3×15, Mollets assis 4×15
Jour 4 - PUSH B : Développé haltères 4×10, Développé incliné haltères 3×10, Dips 3×max, Arnold press 3×10, Élévations frontales 3×12, Triceps crâne 3×12
Jour 5 - PULL B : Tirage serré 4×10, Rowing câble 3×12, Pull-over 3×12, Oiseau 3×15, Curl concentré 3×12, Curl barre EZ 3×10
Jour 6 - LEGS ISCHIO : Romanian DL 4×8, Leg curl couché 4×10, Fente bulgare 3×10, Hip thrust 3×12, Leg curl assis 3×12, Mollets debout 4×15`
}

const MALE_RULES = `
PRIORITES MASCULINES :
- Membres superieurs = 60% du volume total
- Membres inferieurs = 40% du volume total
- Priorite absolue : Poitrine, Dos, Epaules
- Secondaire : Bras (biceps/triceps), Abdos
- Jambes : quadriceps ET ischio-jambiers toujours separes
  * Jour Quads : Squat, Leg Press, Fentes avant, Leg Extension
  * Jour Ischio : Romanian DL, Leg Curl, Fentes bulgares, Hip Thrust`

const FEMALE_RULES = `
PRIORITES FEMININES :
- Membres inferieurs = 65% du volume total
- Membres superieurs = 35% du volume total
- Priorite absolue : Fessiers, Ischio-jambiers, Quadriceps
- Secondaire : Abdos/Core, Epaules (pour silhouette)
- Poitrine et bras : volume minimal (tonification)
- MUSCLES FESSIERS — toujours inclure au moins 2 exercices fessiers par seance lower :
  Hip thrust, Kickbacks cable, Abduction machine/cable, Fesses a 45, Sumo squat, Romanian DL, Pont fessier`

const UNIVERSAL_RULES = `
REGLES SCIENTIFIQUES OBLIGATOIRES :
1. Jamais deux seances du meme groupe musculaire consecutives
2. Minimum 48h de recuperation par groupe musculaire
3. Les grands groupes (dos, jambes) en debut de seance
4. Les petits groupes (bras, mollets) en fin de seance
5. Pour 6 jours : les jambes jamais le 3e jour consecutif
6. Exercices polyarticulaires avant isolation (Squat avant Leg extension, Developpe avant Ecarte)
7. Sets recommandes :
   - Exercices principaux : 4 series x 6-10 reps
   - Exercices secondaires : 3 series x 10-15 reps
   - Isolation/finition : 3 series x 12-20 reps
8. Chaque exercice doit avoir un temps de repos :
   - Compound lourd : 120s
   - Compound moyen : 90s
   - Isolation : 60s
9. TEMPO (format excentrique-pause-concentrique) :
   - Hypertrophie : tempo lent (3-1-2, 4-1-1) pour les exercices d'isolation
   - Force/Puissance : tempo rapide (1-0-1, 2-0-1) pour les exercices composés lourds
   - Standard : tempo moyen (2-0-2) par défaut
   - Toujours au format "X-X-X" (3 chiffres séparés par des tirets)
10. TECHNIQUES AVANCEES (optionnel, selon le niveau) :
   - Debutant : AUCUNE technique avancee, tempo 2-0-2 partout
   - Intermediaire : 1 technique par seance maximum
   - Avance : 2 techniques par seance maximum
   - Types : "dropset" (drops: 1-3), "restpause" (mini-sets: 2-3, repos: 10-15s), "superset" (avec un autre exercice), "mechanical" (changement prise/angle)
   - technique = null si pas de technique
   - technique_details = "" si pas de technique
   - Pour dropset : technique_details = "2" (nombre de drops)
   - Pour restpause : technique_details = "2,15" (mini-sets,repos en secondes)
   - Pour superset : technique_details = "nom de l'exercice partenaire"
   - Pour mechanical : technique_details = "description de la variation"`

/**
 * Generate a training program via Anthropic tool_use.
 * Pure function: no auth, no request, no rate-limit.
 * Throws on error (caller handles).
 */
export async function generateProgram(input: GenerateProgramInput, apiKey: string, catalog: { id: string; name: string }[] = []): Promise<any> {
  const { objective, level, daysPerWeek, duration, equipment, priorities, notes, gender: bodyGender } = input

  const gender = bodyGender || 'male'
  const isFemale = gender === 'female' || gender === 'femme' || gender === 'f'
  const days = typeof daysPerWeek === 'number' ? daysPerWeek : (parseInt(String(daysPerWeek)) || 4)
  const programStructure = getProgramStructure(days, isFemale)
  const genderRules = isFemale ? FEMALE_RULES : MALE_RULES

  const systemPrompt = `${PROGRAM_GENERATION_PROMPT}

${genderRules}

${UNIVERSAL_RULES}

${getPrefatigueInstructions()}

${programStructure}

${catalog.length > 0 ? `
RÉFÉRENTIEL D'EXERCICES (${catalog.length} exercices) :
Choisis le nom de chaque exercice EXACTEMENT dans cette liste quand le mouvement y figure.
N'invente pas de variante orthographique (accents, pluriels, casse).
Si un mouvement n'existe pas dans la liste, nomme-le clairement.
${catalog.map(c => c.name).join(', ')}
` : ''}
Structure obligatoire pour ${days} jours/semaine.
Adapte au niveau ${level || 'intermediaire'} et objectif ${objective || 'renforcement musculaire'}.
Duree cible par seance : ${duration || 60} minutes.
Equipement disponible : ${equipment || 'salle de musculation complete'}.
${(priorities || []).length ? `Zones prioritaires : ${priorities.join(', ')}` : ''}
${notes ? `Notes supplementaires : ${notes}` : ''}

Reponds UNIQUEMENT avec du JSON valide, aucun texte avant ou apres.`

  const userPrompt = `Genere un programme ${days} jours/semaine pour ${isFemale ? 'une femme' : 'un homme'}, niveau ${level || 'intermediaire'}, objectif ${objective || 'renforcement'}.

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
- 5-7 exercices par jour
- Suis la structure indiquee dans le system prompt
- Chaque exercice a un order (1, 2, 3...), sets, reps, rest_seconds
- muscle_groups utilise des IDs anglais : chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, core, abs
- Chaque exercice a un tempo (format "X-X-X"), technique (null ou "dropset"/"restpause"/"superset"/"mechanical"), et technique_details
- Pour les debutants : pas de techniques avancees, tempo "2-0-2" partout
- Pour les intermediaires : max 1 technique par jour
- Pour les avances : max 2 techniques par jour`

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
                    description: '5 a 7 exercices par jour',
                    items: {
                      type: 'object',
                      required: ['custom_name', 'muscle_primary', 'sets', 'reps', 'rest_seconds', 'order', 'tempo', 'technique', 'technique_details'],
                      properties: {
                        custom_name: { type: 'string', description: 'Nom de l\'exercice' },
                        muscle_primary: { type: 'string', description: 'Muscle principal travaille (en francais)' },
                        sets: { type: 'integer', description: 'Nombre de series' },
                        reps: { type: 'integer', description: 'Nombre de repetitions' },
                        rest_seconds: { type: 'integer', description: 'Temps de repos en secondes' },
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

  const json = await res.json()
  const toolUseBlock = json.content?.find((c: any) => c.type === 'tool_use')
  if (!toolUseBlock) {
    console.error('[generateProgram] No tool_use in response:', JSON.stringify(json).slice(0, 500))
    throw new Error('Format IA invalide')
  }

  const program = unwrapToolInput(toolUseBlock.input)

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
