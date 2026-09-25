import type { WorkoutDraftExercise } from './active-workout-draft'

export function dropCount(details: unknown): number | null {
  return typeof details === 'string' && /^[123]$/.test(details.trim()) ? Number(details) : null
}

/** Editor prescription: mini-set count, pause in seconds. Applied after the final main set only. */
export function restPausePrescription(details: unknown): { count: number; rest: number } | null {
  const match = typeof details === 'string' ? /^([23]),(10|15|20)$/.exec(details.trim()) : null
  return match ? { count: Number(match[1]), rest: Number(match[2]) } : null
}

type Prescription = { name: string; technique?: string; techniqueDetails?: string; targetSets: number; targetDurationSeconds?: number }
export type BisetPair = { a: number; b: number }

/** Legacy names are accepted only when they identify one real partner. Never guess. */
export function bisetPairs(exercises: readonly Prescription[]): BisetPair[] {
  const candidates: BisetPair[] = []
  exercises.forEach((exercise, index) => {
    if (exercise.technique !== 'superset' || !exercise.techniqueDetails?.trim() || exercise.targetDurationSeconds) return
    if (exercises.filter(e => e.name === exercise.name).length !== 1) return
    const matches = exercises.flatMap((e, i) => e.name === exercise.techniqueDetails?.trim() && i !== index ? [i] : [])
    if (matches.length !== 1) return
    const partnerIndex = matches[0], partner = exercises[partnerIndex]
    if (partner.targetDurationSeconds || partner.targetSets !== exercise.targetSets) return
    if (partner.technique && !(partner.technique === 'superset' && partner.techniqueDetails?.trim() === exercise.name)) return
    const a = Math.min(index, partnerIndex), b = Math.max(index, partnerIndex)
    if (!candidates.some(pair => pair.a === a && pair.b === b)) candidates.push({ a, b })
  })
  // A third exercise claiming either member makes the whole group ambiguous.
  return candidates.filter(pair =>
    !exercises.some((ex, i) => i !== pair.a && i !== pair.b && ex.technique === 'superset' && [exercises[pair.a].name, exercises[pair.b].name].includes(ex.techniqueDetails?.trim() || '')) &&
    !candidates.some(other => other !== pair && [other.a, other.b].some(i => i === pair.a || i === pair.b)))
}

export function bisetFor(exercises: readonly Prescription[], index: number): BisetPair | undefined {
  return bisetPairs(exercises).find(pair => pair.a === index || pair.b === index)
}

/** A broken historical prescription may be repaired for this workout only. */
export function relinkWorkoutBiset(
  exercises: readonly WorkoutDraftExercise[],
  index: number,
  partnerIndex: number,
): WorkoutDraftExercise[] | null {
  const exercise = exercises[index], partner = exercises[partnerIndex]
  if (!exercise || !partner || index === partnerIndex || exercise.technique !== 'superset') return null
  if (exercise.targetDurationSeconds || partner.targetDurationSeconds || exercise.targetSets !== partner.targetSets) return null
  if (partner.technique && !(partner.technique === 'superset' && partner.techniqueDetails === exercise.name)) return null
  const updated = exercises.map((row, i) => i === index
    ? { ...row, techniqueDetails: partner.name }
    : i === partnerIndex
      ? { ...row, technique: 'superset', techniqueDetails: exercise.name }
      : row)
  const pair = bisetFor(updated, index)
  return pair && [pair.a, pair.b].includes(partnerIndex) ? updated : null
}

export function workoutBisetPartnerOptions(exercises: readonly WorkoutDraftExercise[], index: number): number[] {
  return exercises.flatMap((_, partnerIndex) => relinkWorkoutBiset(exercises, index, partnerIndex) ? [partnerIndex] : [])
}

/** Explicit solo fallback; never mislabel a logged set as a valid biset. */
export function workoutBisetAsSolo(exercises: readonly WorkoutDraftExercise[], index: number): WorkoutDraftExercise[] {
  return exercises.map((row, i) => i === index ? { ...row, technique: undefined, techniqueDetails: undefined } : row)
}

export function techniqueIssue(exercises: readonly WorkoutDraftExercise[], index: number): 'missingDrops' | 'invalidBiset' | 'invalidRestPause' | null {
  const ex = exercises[index]
  if (ex?.technique === 'dropset' && (ex.targetDurationSeconds || !ex.sets.some(set => set.parentSetNumber))) return 'missingDrops'
  if (ex?.technique === 'superset' && !bisetFor(exercises, index)) return 'invalidBiset'
  if (ex?.technique === 'restpause' && (ex.targetDurationSeconds || !restPausePrescription(ex.techniqueDetails))) return 'invalidRestPause'
  return null
}

/** Rest after B; no programmed break between A and B or before a drop stage. */
export function transitionRest(exercises: readonly WorkoutDraftExercise[], from: number, next: { currentExerciseIndex: number; currentSetIndex: number }): number {
  if (exercises.every(ex => ex.sets.every(set => set.done))) return 0
  const upcoming = exercises[next.currentExerciseIndex]?.sets[next.currentSetIndex]
  if (next.currentExerciseIndex === from && upcoming?.parentSetNumber && !upcoming.done) {
    return exercises[from].technique === 'restpause' ? restPausePrescription(exercises[from].techniqueDetails)?.rest ?? 0 : 0
  }
  const pair = bisetFor(exercises, from)
  if (pair?.a === from && next.currentExerciseIndex === pair.b) return 0
  return exercises[from]?.rest ?? 90
}
