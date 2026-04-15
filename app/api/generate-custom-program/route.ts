import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../lib/rate-limit'
import { getPrefatigueInstructions } from '../../../lib/prefatigue-mapping'
import { PROGRAM_GENERATION_PROMPT } from '../../../lib/coach-knowledge'

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

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const rl = checkRateLimit(`custom-prog:${ip}`, 3, 60000)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requetes' }, { status: 429 })

  try {
    const body = await req.json()
    const { objective, level, daysPerWeek, duration, equipment, priorities, notes, gender: bodyGender, userId } = body

    // Guard: invited clients cannot generate AI programs
    if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { guardInvitedClient } = await import('../../../lib/api-guard')
      const blocked = await guardInvitedClient(userId)
      if (blocked) return blocked
    }

    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'API key manquante' }, { status: 500 })
    }

    const gender = bodyGender || 'male'
    const isFemale = gender === 'female' || gender === 'femme' || gender === 'f'
    const days = parseInt(daysPerWeek) || 4
    const programStructure = getProgramStructure(days, isFemale)
    const genderRules = isFemale ? FEMALE_RULES : MALE_RULES

    const systemPrompt = `${PROGRAM_GENERATION_PROMPT}

${genderRules}

${UNIVERSAL_RULES}

${getPrefatigueInstructions()}

${programStructure}

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
          "custom_name": "Developpe couche barre",
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[generate-custom-program] Anthropic error:', res.status, err.slice(0, 200))
      return NextResponse.json({ error: `Anthropic ${res.status}` }, { status: 500 })
    }

    const json = await res.json()
    const raw = json.content?.[0]?.text || ''

    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) {
      console.error('[generate-custom-program] No JSON found in response:', raw.slice(0, 200))
      return NextResponse.json({ error: 'JSON introuvable dans la reponse' }, { status: 500 })
    }

    let cleaned = raw.slice(start, end + 1)
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')

    const program = JSON.parse(cleaned)

    // Post-process: normalize day names to standard types
    const TYPE_MAP: Record<string, string> = {
      'push': 'Pectoraux', 'chest': 'Pectoraux', 'pec': 'Pectoraux', 'poitrine': 'Pectoraux',
      'pull': 'Dos', 'back': 'Dos', 'dorsal': 'Dos',
      'legs': 'Jambes', 'lower': 'Jambes', 'quads': 'Jambes', 'ischio': 'Jambes', 'glute': 'Jambes', 'fessier': 'Jambes',
      'upper': 'Haut du Corps', 'epaule': 'Épaules', 'shoulder': 'Épaules',
      'full body': 'Full Body', 'cardio': 'Cardio',
    }
    if (program.days) {
      for (const day of program.days) {
        if (day.name) {
          const n = day.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          for (const [key, val] of Object.entries(TYPE_MAP)) {
            if (n.includes(key)) { day.name = val; break }
          }
        }
      }
    }

    return NextResponse.json({ program })

  } catch (e: any) {
    console.error('[generate-custom-program] ERROR:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
