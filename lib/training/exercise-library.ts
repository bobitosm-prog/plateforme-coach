import { matchMuscleFilter } from '../i18n-muscle'

export type ExerciseLibrarySource = 'catalog' | 'custom'

export interface ExerciseLibraryLike {
  id?: string | null
  name?: string | null
  exercise_name?: string | null
  custom_name?: string | null
  exerciseName?: string | null
  muscle_group?: string | null
  equipment?: string | null
  _custom?: boolean
  isCustom?: boolean
  [key: string]: unknown
}

export interface ExerciseLibrarySearchOptions {
  search?: string
  muscle?: string | null
  allMusclesKey?: string
  muscleMatch?: 'aliases' | 'exact' | 'case-insensitive'
  limit?: number
}

export interface ExerciseLibrarySearchResult<T> {
  results: T[]
  unsupported: T[]
}

export function normalizeExerciseSearchText(value: string): string {
  return value.normalize('NFC').toLocaleLowerCase('fr')
}

export function resolveLegacyExerciseName(exercise: ExerciseLibraryLike): string | null {
  for (const value of [exercise.name, exercise.exercise_name, exercise.custom_name, exercise.exerciseName]) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export function resolveExerciseLibrarySource(exercise: ExerciseLibraryLike): ExerciseLibrarySource {
  return exercise._custom === true || exercise.isCustom === true ? 'custom' : 'catalog'
}

export function combineExerciseLibraries<T extends ExerciseLibraryLike, U extends ExerciseLibraryLike>(
  catalog: readonly T[],
  custom: readonly U[],
): Array<T | (U & { _custom: true })> {
  return [...catalog, ...custom.map(exercise => ({ ...exercise, _custom: true as const }))]
}

export function searchExerciseLibrary<T extends ExerciseLibraryLike>(
  entries: readonly T[],
  options: ExerciseLibrarySearchOptions = {},
): ExerciseLibrarySearchResult<T> {
  const search = normalizeExerciseSearchText(options.search ?? '')
  const allMusclesKey = options.allMusclesKey ?? '__all__'
  const muscle = options.muscle && options.muscle !== allMusclesKey ? options.muscle : null
  const muscleMatch = options.muscleMatch ?? 'aliases'
  const limit = options.limit === undefined ? null : Math.max(0, Math.trunc(options.limit))
  const unsupported: T[] = []
  const results: T[] = []

  for (const entry of entries) {
    const name = resolveLegacyExerciseName(entry)
    if (!name) {
      unsupported.push(entry)
      continue
    }
    if (search && !normalizeExerciseSearchText(name).includes(search)) continue
    if (muscle && !matchesMuscle(entry.muscle_group, muscle, muscleMatch)) continue
    if (limit === 0) continue
    results.push(entry)
    if (limit !== null && results.length >= limit) break
  }

  return { results, unsupported }
}

export function findExerciseAlternatives<T extends ExerciseLibraryLike>(
  entries: readonly T[],
  selected: ExerciseLibraryLike,
  limit = 3,
): T[] {
  const selectedName = resolveLegacyExerciseName(selected)
  const selectedMuscle = normalizeOptional(selected.muscle_group)
  if (!selectedName || !selectedMuscle) return []

  return entries.filter(entry => {
    const name = resolveLegacyExerciseName(entry)
    if (!name || normalizeOptional(entry.muscle_group) !== selectedMuscle) return false
    if (selected.id && entry.id === selected.id) return false
    return name !== selectedName
  }).slice(0, Math.max(0, Math.trunc(limit)))
}

export function collectProgramExerciseNames(programDays: unknown, limit = 6): string[] {
  if (!Array.isArray(programDays)) return []
  const names: string[] = []
  for (const day of programDays) {
    if (!isRecord(day) || !Array.isArray(day.exercises)) continue
    for (const exercise of day.exercises) {
      if (!isRecord(exercise)) continue
      const name = resolveLegacyExerciseName(exercise)
      if (name && !names.includes(name)) names.push(name)
      if (names.length >= Math.max(0, Math.trunc(limit))) return names
    }
  }
  return names
}

export function resolveFreeSessionExercise(exercise: ExerciseLibraryLike): Record<string, unknown> | null {
  const name = resolveLegacyExerciseName(exercise)
  if (!name) return null
  return {
    exercise_name: name,
    muscle_group: exercise.muscle_group,
    sets: 3,
    reps: 10,
    rest_seconds: 90,
    video_url: exercise.video_url,
    gif_url: exercise.gif_url,
  }
}

export function resolveAddedExercise(
  exercise: ExerciseLibraryLike,
  prescription: { sets: string; reps: string; restSeconds: string },
): Record<string, unknown> | null {
  const name = resolveLegacyExerciseName(exercise)
  if (!name) return null
  return {
    name,
    exercise_name: name,
    muscle_group: exercise.muscle_group || '',
    sets: Number.parseInt(prescription.sets, 10) || 3,
    reps: Number.parseInt(prescription.reps, 10) || 10,
    rest_seconds: Number.parseInt(prescription.restSeconds, 10) || 60,
  }
}

function matchesMuscle(
  exerciseMuscle: string | null | undefined,
  filter: string,
  mode: 'aliases' | 'exact' | 'case-insensitive',
): boolean {
  if (mode === 'aliases') return matchMuscleFilter(exerciseMuscle, filter)
  if (mode === 'case-insensitive') return normalizeOptional(exerciseMuscle) === normalizeOptional(filter)
  return exerciseMuscle === filter
}

function normalizeOptional(value: unknown): string | null {
  return typeof value === 'string' && value
    ? normalizeExerciseSearchText(value)
    : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
