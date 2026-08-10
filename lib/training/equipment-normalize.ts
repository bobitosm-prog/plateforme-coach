/** Canonical equipment categories used after the Phase 6B.0 SQL migration. */

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
 * Returns true if the equipment can be used at home with minimal setup
 * (dumbbells, kettlebells, bands, bodyweight only).
 */
export function isHomeFriendly(equipment: Equipment): boolean {
  return (HOME_FRIENDLY_EQUIPMENT as readonly string[]).includes(equipment)
}
