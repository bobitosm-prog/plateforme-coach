import { foldExerciseName } from './exercise-identity'

/** Incomplete legacy descriptions must not silently become precise prescriptions. */
export const CATALOG_REVIEW_NAMES = [
  'Développé Militaire', 'Développé Militaire Barre', 'Face Pulls',
  'Rowing Barre', 'Rowing Haltère', 'Extension Triceps Poulie',
  'Triceps Poulie Corde', 'Oiseau / Reverse Fly', 'Soulevé de Terre Roumain',
  'Glute Bridge', 'Russian Twist', 'Torsion Russe Lestée',
] as const

export function requiresCatalogReview(name: string): boolean {
  return CATALOG_REVIEW_NAMES.some(held => foldExerciseName(held) === foldExerciseName(name))
}
