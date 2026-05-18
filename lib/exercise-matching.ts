/**
 * Exercise name matching utilities.
 * Handles AI-generated name variants vs DB catalog names.
 */

export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\([^)]*\)/g, ' ')                       // remove (Barre/Halt)
    .replace(/[^\w\s]/g, ' ')                         // remove punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

export function findExerciseMatch<T extends { name?: string | null }>(
  cache: T[],
  programName: string
): T | undefined {
  if (!programName) return undefined

  const normalizedProgram = normalizeExerciseName(programName)

  // 1. Exact normalized match
  let match = cache.find(d =>
    d.name && normalizeExerciseName(d.name) === normalizedProgram
  )
  if (match) return match

  // 2. Prefix fallback: DB name is a prefix of program name
  //    Sort by length desc to match most specific first
  const sortedCache = [...cache]
    .filter(d => d.name)
    .sort((a, b) => (b.name!.length - a.name!.length))

  match = sortedCache.find(d => {
    const normalizedDb = normalizeExerciseName(d.name!)
    return normalizedProgram.startsWith(normalizedDb + ' ') ||
           normalizedProgram === normalizedDb
  })

  return match
}
