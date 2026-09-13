import { describe, expect, it } from 'vitest'
import {
  AthenaTrainingOutputError,
  validateAthenaTrainingOutput,
} from '@/lib/athena/training-output'
import { normalizeAthenaTrainingRequest } from '@/lib/athena/training-policy'

const REQUEST = normalizeAthenaTrainingRequest({
  objective: 'prise de muscle',
  level: 'intermediaire',
  daysPerWeek: 2,
  durationMinutes: 30,
  equipment: 'haltères',
  priorities: ['dos'],
  notes: '',
})

function exercise(order: number, overrides: Record<string, unknown> = {}) {
  return {
    custom_name: `Exercice ${order}`,
    muscle_primary: 'Dos',
    sets: 3,
    reps: 10,
    rest_seconds: 120,
    order,
    tempo: '2-0-2',
    technique: null,
    technique_details: '',
    ...overrides,
  }
}

function validProgram() {
  return {
    program_name: 'Programme test',
    description: 'Programme soutenable',
    days: [1, 2].map(day => ({
      day_number: day,
      name: `Full body ${day}`,
      focus: 'Corps entier',
      muscle_groups: ['back', 'quads'],
      exercises: [exercise(1), exercise(2), exercise(3)],
    })),
  }
}

describe('Athena training output validation', () => {
  it('accepts a program matching the normalized contract', () => {
    expect(validateAthenaTrainingOutput(validProgram(), REQUEST).days).toHaveLength(2)
  })

  it.each([
    ['too many sets', { sets: 20 }],
    ['invalid reps', { reps: 0 }],
    ['unsafe rest', { rest_seconds: 10 }],
    ['invalid tempo', { tempo: 'lent' }],
  ])('rejects %s', (_label, override) => {
    const program = validProgram()
    program.days[0].exercises[0] = exercise(1, override)

    expect(() => validateAthenaTrainingOutput(program, REQUEST)).toThrow(AthenaTrainingOutputError)
  })

  it('rejects missing days, wrong order and duplicate exercises', () => {
    const missingDay = validProgram()
    missingDay.days.pop()
    expect(() => validateAthenaTrainingOutput(missingDay, REQUEST)).toThrow(/non conforme/)

    const wrongOrder = validProgram()
    wrongOrder.days[0].exercises[1].order = 3
    expect(() => validateAthenaTrainingOutput(wrongOrder, REQUEST)).toThrow(/non conforme/)

    const duplicate = validProgram()
    duplicate.days[0].exercises[1].custom_name = duplicate.days[0].exercises[0].custom_name
    expect(() => validateAthenaTrainingOutput(duplicate, REQUEST)).toThrow(/non conforme/)
  })

  it('limits advanced techniques according to experience', () => {
    const intermediateProgram = validProgram()
    intermediateProgram.days[0].exercises[0] = exercise(1, { technique: 'dropset', technique_details: '1' })
    intermediateProgram.days[0].exercises[1] = exercise(2, { technique: 'restpause', technique_details: '2,15' })
    expect(() => validateAthenaTrainingOutput(intermediateProgram, REQUEST)).toThrow(/non conforme/)

    const beginnerRequest = { ...REQUEST, level: 'debutant' as const }
    const beginnerProgram = validProgram()
    beginnerProgram.days[0].exercises[0] = exercise(1, { technique: 'dropset', technique_details: '1' })
    expect(() => validateAthenaTrainingOutput(beginnerProgram, beginnerRequest)).toThrow(/non conforme/)
  })

  it('removes unknown output fields rather than persisting them', () => {
    const program = validProgram() as ReturnType<typeof validProgram> & { injected?: string }
    program.injected = 'ignore me'
    const validated = validateAthenaTrainingOutput(program, REQUEST)

    expect(validated).not.toHaveProperty('injected')
  })
})
