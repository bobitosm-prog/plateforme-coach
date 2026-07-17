/**
 * Equipment Normalization Helper — Phase 6B.0
 *
 * Maps the 44 legacy textual values in exercises_db.equipment to 6 strict enum values.
 * Used by:
 *   - SQL migration backfill (one-shot)
 *   - Future writes to exercises_db (if user_id-created exos via NutritionPreferences or admin)
 *   - Substitution logic in /api/generate-custom-program (F6.B.4)
 *
 * Decisions (see docs/PHASE_6B_TRAINING_VISION.md):
 *   - "Barre de traction" → bodyweight (pull-up bar = environment, exo uses body weight)
 *   - "Battle Ropes" → band (transportable cardio accessory)
 *   - "Debout"/"Assis" (positions) → machine_gym (calf extensions context)
 *   - "Barre ou Haltères" → barbell (heavier/more serious option)
 *   - "banc" → machine_gym (mixed cases compromise)
 *
 * Derived flag:
 *   home_friendly = equipment IN ('dumbbell', 'kettlebell', 'band', 'bodyweight')
 */

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'band'
  | 'bodyweight'
  | 'machine_gym'

export const EQUIPMENT_VALUES: readonly Equipment[] = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'band',
  'bodyweight',
  'machine_gym',
] as const

export const HOME_FRIENDLY_EQUIPMENT: readonly Equipment[] = [
  'dumbbell',
  'kettlebell',
  'band',
  'bodyweight',
] as const

/**
 * Maps a legacy equipment string to the normalized Equipment enum.
 * Returns null if the input is not in the known mapping (caller should handle).
 *
 * Case-sensitive: legacy DB has 'Haltères' and 'haltères' as DISTINCT values.
 * Both map to 'dumbbell'.
 */
export function normalizeEquipment(legacy: string | null | undefined): Equipment | null {
  if (!legacy) return null
  const mapping = EQUIPMENT_LEGACY_MAP[legacy]
  return mapping ?? null
}

/**
 * Returns true if the equipment can be used at home with minimal setup
 * (dumbbells, kettlebells, bands, bodyweight only).
 */
export function isHomeFriendly(equipment: Equipment): boolean {
  return (HOME_FRIENDLY_EQUIPMENT as readonly string[]).includes(equipment)
}

/**
 * Returns all legacy values that map to a given normalized equipment.
 * Useful for SQL migrations (build IN clause).
 */
export function getLegacyValuesForEquipment(equipment: Equipment): string[] {
  return Object.entries(EQUIPMENT_LEGACY_MAP)
    .filter(([, eq]) => eq === equipment)
    .map(([legacy]) => legacy)
}

/**
 * Complete legacy → normalized mapping (44 → 6).
 * Generated from audit of 30 mai 2026 on exercises_db.
 * Each entry validated against actual exercise names visible at audit time.
 */
const EQUIPMENT_LEGACY_MAP: Record<string, Equipment> = {
  // === barbell (≈33 exos après normalisation) ===
  'Barre': 'barbell',
  'barre': 'barbell',
  'Barre EZ': 'barbell',
  'barre EZ': 'barbell',
  'T-bar': 'barbell',
  'disque': 'barbell',
  'Barre, Banc': 'barbell',
  'Barre EZ, Banc': 'barbell',
  'Barre ou Haltères': 'barbell',

  // === dumbbell (≈37 exos après normalisation) ===
  'Haltères': 'dumbbell',
  'haltères': 'dumbbell',
  'Haltère': 'dumbbell',
  'Haltère, Banc': 'dumbbell',
  'Haltères, Banc incliné': 'dumbbell',
  'Disque ou Haltère': 'dumbbell',
  'Aucun ou Haltère': 'dumbbell',
  'Haltère ou Balle': 'dumbbell',

  // === kettlebell (2 exos) ===
  'Kettlebell': 'kettlebell',

  // === band (3 exos) ===
  'Cordes': 'band',
  'Battle Ropes': 'band',
  'Roue abdominale': 'band',

  // === bodyweight (≈27 exos après normalisation) ===
  'Poids du corps': 'bodyweight',
  'poids du corps': 'bodyweight',
  'Aucun': 'bodyweight',
  'Aucun ou Sol': 'bodyweight',
  'Barre ou Sol': 'bodyweight',
  'Barres parallèles': 'bodyweight',
  'Box': 'bodyweight',
  'Barre de traction': 'bodyweight',

  // === machine_gym (≈76 exos après normalisation) ===
  'Machine': 'machine_gym',
  'machine': 'machine_gym',
  'Poulie': 'machine_gym',
  'poulie': 'machine_gym',
  'Poulie haute': 'machine_gym',
  'Poulie basse': 'machine_gym',
  'Poulie haute + Corde': 'machine_gym',
  'Haltères ou Poulie': 'machine_gym',
  'Tapis roulant': 'machine_gym',
  'Elliptique': 'machine_gym',
  'Vélo': 'machine_gym',
  'Machine à ramer': 'machine_gym',
  'Debout': 'machine_gym',
  'Assis': 'machine_gym',
  'banc': 'machine_gym',
}
