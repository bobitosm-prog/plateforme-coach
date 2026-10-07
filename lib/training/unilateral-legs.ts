import { foldExerciseName } from './exercise-identity'
import type { WorkoutDraftSet } from './active-workout-draft'

export type LegSide = 'left' | 'right'
export function isLegSide(value: unknown): value is LegSide { return value === 'left' || value === 'right' }

/** Only leg movements: a triceps kickback must never become a two-leg exercise. */
export function isAlternatingLegExercise(row: Record<string, unknown>): boolean {
  const name = foldExerciseName(String(row.name ?? row.exercise_name ?? row.custom_name ?? ''))
  const muscle = foldExerciseName(String(row.muscle ?? row.muscle_group ?? ''))
  if (/triceps|bras|arm/.test(name + ' ' + muscle)) return false
  return /\bfentes?\b|\blunges?\b/.test(name) ||
    (/\bkick\s*backs?\b/.test(name) && (/fessier|glute|jambe|leg/.test(name + ' ' + muscle) ||
      ['kickbacks cable', 'kickbacks machine', 'kickbacks poulie'].includes(name)))
}

/** Expand a new prescription once. Keep final drop/rest-pause stages with their leg. */
export function expandLegSets(sets: WorkoutDraftSet[]): WorkoutDraftSet[] {
  const result: WorkoutDraftSet[] = []
  let round = 0
  for (const main of sets.filter(set => !set.parentSetNumber)) {
    round++
    const chain = [main]
    let child = sets.find(set => set.parentSetNumber === main.num)
    while (child && !chain.includes(child)) {
      chain.push(child)
      child = sets.find(set => set.parentSetNumber === child!.num)
    }
    for (const side of ['left', 'right'] as const) {
      for (let i = 0; i < chain.length; i++) {
        result.push({ ...chain[i], id: `${chain[i].id}_${side}`, num: result.length + 1,
          side, roundNumber: round, parentSetNumber: i ? result.length : undefined })
      }
    }
  }
  return result
}
