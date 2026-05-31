/**
 * Build the POST body for /api/generate-custom-program from a profile.
 *
 * Used by:
 *   - Phase 6 F6.B.4 : refacto endpoint pour utiliser ce helper
 *   - Phase 6 F6.B.5 : auto-gen post-onboarding (déclenche après case 11)
 *   - Phase 6 F6.B.5b : auto-regen post-Apply diagnostic (équivalent F6.A.2)
 *
 * Handles equipment string composition based on training_location + home_equipment[]:
 *   - 'gym'  → "salle de musculation complète"
 *   - 'home' → "maison : poids du corps[, haltères][, kettlebell][, bandes élastiques]"
 *   - 'both' → "salle de musculation complète + matériel maison disponible"
 *
 * Optional overrides allow callers to inject custom values (e.g. après Apply
 * d'un diagnostic avec training_volume_delta_pct, override duration ou daysPerWeek).
 */
import type { Profile } from '@/lib/profile-service'

export type Gender = 'male' | 'female'

export type Level = 'debutant' | 'intermediaire' | 'avance'

export interface ProgramOverrides {
  daysPerWeek?: number
  duration?: number
  level?: Level
  priorities?: string[]
  notes?: string
}

export interface ProgramParams {
  objective: string
  level: Level
  daysPerWeek: number
  duration: number
  equipment: string
  priorities: string[]
  notes: string
  gender: Gender
}

/**
 * Maps a French objective string (from profile.objective) to a normalized form
 * accepted by the API. The API itself is tolerant to various phrasings.
 */
function normalizeObjective(objective: string | null | undefined): string {
  if (!objective) return 'renforcement musculaire'
  const o = objective.toLowerCase().trim()
  if (o.includes('perdre') || o === 'cut' || o.includes('seche') || o.includes('sèche')) return 'sèche'
  if (o.includes('prendre') || o === 'bulk' || o.includes('muscle')) return 'prise de muscle'
  if (o.includes('améliorer') || o.includes('ameliorer') || o.includes('condition')) return 'amélioration condition'
  if (o.includes('remettre') || o.includes('forme')) return 'remise en forme'
  return objective // fallback : laisse passer la valeur brute
}

/**
 * Maps an experience_level string (from profile.onboarding_answers) to the API enum.
 * Profile stores FR labels (Débutant, Intermédiaire, Expérimenté, Vétéran).
 */
function normalizeLevel(experienceLevel: string | null | undefined): Level {
  if (!experienceLevel) return 'intermediaire'
  const e = experienceLevel.toLowerCase().trim()
  if (e.includes('débutant') || e.includes('debutant')) return 'debutant'
  if (e.includes('expérimenté') || e.includes('experimente') || e.includes('vétéran') || e.includes('veteran')) return 'avance'
  return 'intermediaire'
}

/**
 * Normalize gender to the API enum (male | female).
 * Profile may store various phrasings ("Homme", "Femme", "male", "female").
 */
function normalizeGender(gender: string | null | undefined): Gender {
  if (!gender) return 'male'
  const g = gender.toLowerCase().trim()
  if (g === 'female' || g === 'femme' || g === 'f') return 'female'
  return 'male'
}

/**
 * Compose the equipment string from training_location + home_equipment[].
 * Output is FR (matches the system prompt language of generate-custom-program).
 */
export function composeEquipmentString(
  trainingLocation: string | null | undefined,
  homeEquipment: string[] | null | undefined,
): string {
  const loc = (trainingLocation || 'gym').toLowerCase().trim()

  if (loc === 'gym') {
    return 'salle de musculation complète'
  }

  if (loc === 'both') {
    return 'salle de musculation complète + matériel maison disponible'
  }

  // loc === 'home' (fallback safe)
  const equip = homeEquipment || []
  const parts: string[] = ['poids du corps']

  if (equip.includes('dumbbell')) parts.push('haltères')
  if (equip.includes('kettlebell')) parts.push('kettlebell')
  if (equip.includes('band')) parts.push('bandes élastiques')

  return `maison : ${parts.join(', ')}`
}

/**
 * Build the full POST body for /api/generate-custom-program.
 *
 * Reads from profile :
 *   - objective : profile.objective (FR or EN, normalized)
 *   - level : profile.onboarding_answers.experience_level (JSONB)
 *   - daysPerWeek : profile.onboarding_answers.sessions_per_week (JSONB, fallback 4)
 *   - duration : default 60 (no profile field yet)
 *   - equipment : composed from training_location + home_equipment
 *   - priorities : default [] (no profile field yet)
 *   - notes : default '' (no profile field yet)
 *   - gender : profile.gender (normalized)
 *
 * Overrides take precedence over profile values.
 */
export function buildProgramParams(
  profile: Profile,
  overrides?: ProgramOverrides,
): ProgramParams {
  // Extract from JSONB onboarding_answers safely
  const onboardingAnswers = (profile.onboarding_answers as Record<string, unknown>) || {}
  const experienceLevel = onboardingAnswers.experience_level as string | undefined
  const sessionsPerWeek = onboardingAnswers.sessions_per_week as number | undefined

  const trainingLocation = profile.training_location as string | undefined
  const homeEquipment = profile.home_equipment as string[] | undefined

  return {
    objective: normalizeObjective(profile.objective),
    level: overrides?.level ?? normalizeLevel(experienceLevel),
    daysPerWeek: overrides?.daysPerWeek ?? sessionsPerWeek ?? 4,
    duration: overrides?.duration ?? 60,
    equipment: composeEquipmentString(trainingLocation, homeEquipment),
    priorities: overrides?.priorities ?? [],
    notes: overrides?.notes ?? '',
    gender: normalizeGender(profile.gender),
  }
}
