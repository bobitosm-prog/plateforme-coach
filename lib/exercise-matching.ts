/**
 * Exercise name matching utilities.
 * Handles AI-generated name variants vs DB catalog names.
 */

import { canonicalExerciseName, foldExerciseName } from './training/exercise-identity'

export function normalizeExerciseName(name: string): string {
  return foldExerciseName(canonicalExerciseName(name))
}

export function findExerciseMatch<T extends { name?: string | null }>(
  cache: T[],
  programName: string
): T | undefined {
  if (!programName) return undefined

  const normalizedProgram = normalizeExerciseName(programName)

  // 1. Exact normalized match
  const matches = cache.filter(d =>
    d.name && normalizeExerciseName(d.name) === normalizedProgram
  )
  // Prefer the reviewed canonical row. Never match a shorter name across equipment/angle qualifiers.
  return matches.find(d => d.name === canonicalExerciseName(programName)) ?? (matches.length === 1 ? matches[0] : undefined)
}
