import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

const SPLIT_GUIDE: Record<number, string> = {
  3: `Split Full Body (3 jours) :
- Jour 1 (Full Body A) : Squat, Développé couché, Rowing barre, Élévations latérales, Curl barre (composés + isolation)
- Jour 2 (Full Body B) : Soulevé de terre roumain, Développé militaire, Tractions, Presse à cuisses, Dips
- Jour 3 (Full Body C) : Hip thrust, Développé incliné haltères, Tirage horizontal, Fentes, Face pulls
Chaque séance travaille tout le corps. 4-5 exercices, 3 sets, 8-12 reps.`,

  4: `Split Upper/Lower (4 jours) :
- Jour 1 (Upper A) : Développé couché, Rowing barre, Développé militaire, Curl barre, Extensions triceps
- Jour 2 (Lower A) : Squat, Soulevé de terre roumain, Presse à cuisses, Leg curl, Mollets debout
- Jour 3 (Upper B) : Tractions, Développé incliné haltères, Tirage horizontal, Élévations latérales, Curl marteau
- Jour 4 (Lower B) : Hip thrust, Hack squat, Fentes marchées, Leg extension, Mollets assis
4-5 exercices par séance, 3-4 sets, 8-12 reps composés, 10-15 reps isolation.`,

  5: `Split Push/Pull/Legs + Upper/Lower (5 jours) :
- Jour 1 (Push) : Développé couché, Développé incliné, Élévations latérales, Dips, Extensions triceps poulie
- Jour 2 (Pull) : Tractions, Rowing barre, Tirage vertical, Curl barre, Face pulls
- Jour 3 (Legs) : Squat, Presse à cuisses, Leg curl, Fentes, Mollets debout
- Jour 4 (Upper) : Développé militaire, Rowing haltère, Développé couché haltères, Curl marteau, Triceps corde
- Jour 5 (Lower) : Soulevé de terre roumain, Hip thrust, Leg extension, Leg curl assis, Mollets assis
4-6 exercices par séance, 3-4 sets, 8-12 reps composés, 10-15 reps isolation.`,

  6: `Split Push/Pull/Legs x2 (6 jours, PPL hypertrophie) :
- Jour 1 (Push A) : Développé couché barre, Développé incliné haltères, Élévations latérales, Dips, Extensions triceps poulie
- Jour 2 (Pull A) : Tractions, Rowing barre, Tirage vertical prise serrée, Curl barre, Face pulls
- Jour 3 (Legs A) : Squat barre, Presse à cuisses, Leg curl allongé, Fentes marchées, Mollets debout
- Jour 4 (Push B) : Développé couché haltères, Développé militaire barre, Élévations latérales câble, Écartés poulie, Triceps corde
- Jour 5 (Pull B) : Rowing haltère unilatéral, Tirage horizontal câble, Pullover, Curl haltères incliné, Curl marteau
- Jour 6 (Legs B) : Soulevé de terre roumain, Hack squat, Leg extension, Hip thrust, Mollets assis
Chaque groupe musculaire 2x/semaine avec variations. 4-6 exercices, 3-4 sets, 8-12 composés, 10-15 isolation. Repos 60-90s isolation, 90-120s composés.`,
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante: NEXT_PUBLIC_ANTHROPIC_API_KEY' }, { status: 500 })
    }

    const { objective, weight, targetWeight, level, equipment, trainingDays } = await req.json()
    const days = Math.min(Math.max(trainingDays || 4, 3), 6)
    const splitGuide = SPLIT_GUIDE[days] || SPLIT_GUIDE[4]

    const prompt = `Tu es un coach fitness expert en hypertrophie. Génère un programme d'entraînement en JSON UNIQUEMENT.

Client: objectif=${objective}, poids=${weight}kg, cible=${targetWeight}kg, niveau=${level}, équipement=${equipment.join(',')}, ${days} jours/semaine

SPLIT RECOMMANDÉ :
${splitGuide}

RÈGLES HYPERTROPHIE :
- Rep range : 8-12 reps exercices composés, 10-15 reps isolation
- Sets : 3-4 par exercice
- Temps de repos : 60-90s isolation, 90-120s composés
- 4-6 exercices par séance
- Volume : 15-20 sets par groupe musculaire par semaine
- Adapte les exercices au niveau du client et à son équipement

Réponds avec SEULEMENT ce JSON (pas de texte avant ou après):
{
  "lundi": {"isRest": false, "day_name": "Push A", "exercises": [{"name": "Développé couché barre", "sets": 4, "reps": 10, "rest": "90s", "notes": ""}]},
  "mardi": {"isRest": false, "day_name": "Pull A", "exercises": [...]},
  "mercredi": {"isRest": false, "day_name": "Legs A", "exercises": [...]},
  "jeudi": {"isRest": false, "day_name": "Push B", "exercises": [...]},
  "vendredi": {"isRest": false, "day_name": "Pull B", "exercises": [...]},
  "samedi": {"isRest": false, "day_name": "Legs B", "exercises": [...]},
  "dimanche": {"isRest": true, "day_name": "Repos", "exercises": []}
}

IMPORTANT :
- Génère exactement ${days} jours d'entraînement et ${7 - days} jours de repos
- Chaque jour doit avoir un "day_name" descriptif (ex: "Push A", "Full Body A", "Upper A")
- Les exercices doivent être réalistes et adaptés au niveau ${level}
- Varie les exercices entre les sessions A et B pour le même groupe musculaire`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      console.error(`[generate-program] Anthropic API error — status: ${anthropicRes.status}, body: ${err}`)
      return NextResponse.json({ error: `Erreur API Anthropic (${anthropicRes.status})`, detail: err }, { status: anthropicRes.status })
    }

    const data = await anthropicRes.json()
    const rawText = data.content[0].text

    // Strip markdown code blocks if present
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    const parsed = JSON.parse(jsonMatch[0])
    const aiProgram: Record<string, { isRest: boolean; day_name?: string; exercises: unknown[] }> = parsed

    // Normalise: ensure all 7 days are present
    for (const d of DAYS) {
      if (!aiProgram[d]) aiProgram[d] = { isRest: true, day_name: 'Repos', exercises: [] }
    }

    return NextResponse.json({ program: aiProgram })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[generate-program] Unhandled error:', message)
    return NextResponse.json({ error: 'Erreur inattendue', detail: message }, { status: 500 })
  }
}
