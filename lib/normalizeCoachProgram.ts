/**
 * Normalise le format du coachProgram pour TrainingTab.
 *
 * Le coach peut stocker le programme dans 2 formats :
 *
 * - Array (nouveau format depuis 2026-04) :
 *   [{ name: "Jour 1", exercises: [...] }, { name: "Jour 2", ... }]
 *
 * - Object indexe par jour francais (ancien format AI-generated) :
 *   { lundi: { exercises: [...] }, mardi: { ... }, ... }
 *
 * TrainingTab actuel attend le format objet. Ce helper convertit
 * l'array en objet en mappant Jour 1 -> lundi, Jour 2 -> mardi, etc.
 *
 * TEMPORAIRE : ce mapping implicite sera remplace par un vrai "choix
 * client du jour" dans un commit ulterieur (voir AUDIT-TRAINING.md
 * section 'Refacto TrainingTab pour clients invited').
 */

const WEEKDAYS_FR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

type WeekdayFr = typeof WEEKDAYS_FR[number]

type DayShape = {
  name?: string
  exercises?: any[]
  is_rest?: boolean
  repos?: boolean
  [key: string]: any
}

type NormalizedProgram = Partial<Record<WeekdayFr, DayShape>>

export function normalizeCoachProgram(raw: unknown): NormalizedProgram | null {
  console.log('[DEBUG normalize] input:', raw)
  console.log('[DEBUG normalize] isArray:', Array.isArray(raw))
  console.log('[DEBUG normalize] typeof:', typeof raw)

  if (!raw) {
    console.log('[DEBUG normalize] returning null (falsy)')
    return null
  }

  // Nouveau format : array of days
  if (Array.isArray(raw)) {
    const result: NormalizedProgram = {}

    for (let i = 0; i < raw.length && i < WEEKDAYS_FR.length; i++) {
      const day = raw[i]
      const weekday = WEEKDAYS_FR[i]

      if (day?.is_rest || day?.repos) {
        result[weekday] = { repos: true, exercises: [] }
      } else {
        result[weekday] = day as DayShape
      }
    }

    console.log('[DEBUG normalize] array mapped to:', result)
    return result
  }

  // Ancien format : deja un objet
  if (typeof raw === 'object') {
    console.log('[DEBUG normalize] object format, returning as-is:', raw)
    return raw as NormalizedProgram
  }

  console.log('[DEBUG normalize] fallback return null')
  return null
}
