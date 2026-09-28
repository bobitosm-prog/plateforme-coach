import type { WorkoutDraftExercise, WorkoutDraftSet } from './active-workout-draft'
import { bisetFor } from './guided-techniques'

export type TechniqueStepKind = 'main' | 'drop' | 'mini' | 'fst7'

export interface TechniqueBoardStep {
  key: string
  exerciseIndex: number
  setIndex: number
  number: number
  total: number
  kind: TechniqueStepKind
  done: boolean
  current: boolean
  weight: WorkoutDraftSet['weight']
  reps: WorkoutDraftSet['reps']
  targetReps: string
}

export interface TechniqueBoardGroup {
  exerciseIndex: number
  name: string
  side?: 'A' | 'B'
  /** Earlier main sets stay visible as compact progress chips; the final drop block stays stacked. */
  earlierMain: TechniqueBoardStep[]
  steps: TechniqueBoardStep[]
}

export interface TechniqueBoardModel {
  kind: 'drop' | 'biset' | 'fst7' | 'restpause' | 'other'
  completed: number
  total: number
  groups: TechniqueBoardGroup[]
}

/** Pure projection of the active draft. It never changes logging order or saved sets. */
export function buildTechniqueBoard(
  exercises: readonly WorkoutDraftExercise[],
  exerciseIndex: number,
  setIndex: number,
): TechniqueBoardModel | null {
  const exercise = exercises[exerciseIndex]
  if (!exercise?.technique) return null
  const pair = bisetFor(exercises, exerciseIndex)
  const memberIndexes = pair ? [pair.a, pair.b] : [exerciseIndex]
  const kind: TechniqueBoardModel['kind'] = pair ? 'biset'
    : exercise.technique === 'dropset' ? 'drop'
      : exercise.technique === 'fst7' ? 'fst7'
        : exercise.technique === 'restpause' ? 'restpause' : 'other'

  const groups = memberIndexes.map((memberIndex, sideIndex): TechniqueBoardGroup => {
    const member = exercises[memberIndex]
    const mainCount = member.sets.filter(set => !set.parentSetNumber).length
    const stageCount = member.sets.length - mainCount
    const allSteps = member.sets.map((set, index): TechniqueBoardStep => {
      const child = Boolean(set.parentSetNumber)
      return {
        key: set.id,
        exerciseIndex: memberIndex,
        setIndex: index,
        number: child ? member.sets.slice(0, index + 1).filter(row => row.parentSetNumber).length
          : member.sets.slice(0, index + 1).filter(row => !row.parentSetNumber).length,
        total: child ? stageCount : mainCount,
        kind: child ? member.technique === 'restpause' ? 'mini' : 'drop'
          : member.technique === 'fst7' ? 'fst7' : 'main',
        done: set.done,
        current: memberIndex === exerciseIndex && index === setIndex && !set.done,
        weight: set.weight,
        reps: set.reps,
        targetReps: member.targetReps,
      }
    })
    const finalMainIndex = kind === 'drop' || kind === 'restpause' ? mainCount - 1 : 0
    return {
      exerciseIndex: memberIndex,
      name: member.name,
      ...(pair ? { side: sideIndex === 0 ? 'A' as const : 'B' as const } : {}),
      earlierMain: finalMainIndex > 0 ? allSteps.slice(0, finalMainIndex) : [],
      steps: finalMainIndex > 0 ? allSteps.slice(finalMainIndex) : allSteps,
    }
  })

  return {
    kind,
    completed: groups.reduce((sum, group) => sum + [...group.earlierMain, ...group.steps].filter(step => step.done).length, 0),
    total: groups.reduce((sum, group) => sum + group.earlierMain.length + group.steps.length, 0),
    groups,
  }
}
