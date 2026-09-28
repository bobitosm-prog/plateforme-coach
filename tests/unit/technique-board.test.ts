import { describe, expect, it } from 'vitest'
import { normalizeWorkoutDraftExercises } from '@/lib/training/active-workout-draft'
import { buildTechniqueBoard } from '@/lib/training/technique-board'

describe('advanced technique board projection', () => {
  it('keeps the final main set and two drops stacked, even after many earlier main sets', () => {
    const exercises = normalizeWorkoutDraftExercises([{ name: 'Élévations latérales', sets: 10, technique: 'dropset', technique_details: '2' }])
    const board = buildTechniqueBoard(exercises, 0, 10)!
    expect(board.total).toBe(12)
    expect(board.groups[0].earlierMain).toHaveLength(9)
    expect(board.groups[0].steps.map(step => [step.kind, step.number])).toEqual([['main', 10], ['drop', 1], ['drop', 2]])
    expect(board.groups[0].steps[1].current).toBe(true)
  })

  it('shows both biset members as separate stacked groups', () => {
    const exercises = normalizeWorkoutDraftExercises([
      { name: 'A', sets: 3, technique: 'superset', technique_details: 'B' },
      { name: 'B', sets: 3 },
    ])
    const board = buildTechniqueBoard(exercises, 1, 0)!
    expect(board.kind).toBe('biset')
    expect(board.groups.map(group => [group.side, group.steps.length])).toEqual([['A', 3], ['B', 3]])
    expect(board.groups[1].steps[0].current).toBe(true)
  })

  it('shows all seven FST-7 sets and preserves their statuses', () => {
    const exercises = normalizeWorkoutDraftExercises([{ name: 'Leg extension', sets: 7, technique: 'fst7' }])
    exercises[0].sets[0].done = true
    const board = buildTechniqueBoard(exercises, 0, 1)!
    expect(board.groups[0].steps).toHaveLength(7)
    expect(board.completed).toBe(1)
    expect(board.groups[0].steps[0].done).toBe(true)
    expect(board.groups[0].steps[1].current).toBe(true)
  })
})
