import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateProgram, type GenerateProgramInput } from '@/lib/training/generate-program'

const INPUT: GenerateProgramInput = {
  objective: 'prise de muscle',
  level: 'debutant',
  daysPerWeek: 3,
  duration: 35,
  equipment: 'haltères',
  priorities: ['dos'],
  notes: '',
  gender: 'female',
}

function anthropicResponse() {
  return new Response(JSON.stringify({
    content: [{
      type: 'tool_use',
      input: {
        program_name: 'Programme test',
        description: 'Test',
        days: Array.from({ length: 3 }, (_, dayIndex) => ({
          day_number: dayIndex + 1,
          name: `Full body ${dayIndex + 1}`,
          focus: 'Corps entier',
          muscle_groups: ['back'],
          exercises: ['Rowing', 'Squat', 'Développé'].map((name, exerciseIndex) => ({
            custom_name: name,
            muscle_primary: 'Dos',
            sets: 3,
            reps: 10,
            rest_seconds: 120,
            order: exerciseIndex + 1,
            tempo: '2-0-2',
            technique: null,
            technique_details: '',
          })),
        })),
      },
    }],
  }), { status: 200 })
}

describe('Athena training generation contract', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends the normalized evidence policy and bounded tool schema', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => anthropicResponse())
    vi.stubGlobal('fetch', fetchMock)

    await generateProgram(INPUT, 'test-key', [{ id: 'exercise-row', name: 'Rowing' }])

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(String(request.body))
    expect(body.system).toContain('<athena_training_policy version="2026-09-13.v1"')
    expect(body.system).toContain('Full body A / Full body B / Full body C')
    expect(body.system).not.toContain('PRIORITES FEMININES')
    expect(body.system).not.toContain('METHODE PRE-FATIGUE OBLIGATOIRE')
    expect(body.tools[0].input_schema.properties.days).toMatchObject({ minItems: 3, maxItems: 3 })
    expect(body.tools[0].input_schema.properties.days.items.properties.exercises).toMatchObject({ minItems: 3, maxItems: 4 })
    expect(body.tools[0].input_schema.properties.days.items.properties.exercises.items.properties.sets).toMatchObject({ minimum: 1, maximum: 4 })
  })

  it('keeps catalog matching while gender does not alter the prescription policy', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => anthropicResponse())
    vi.stubGlobal('fetch', fetchMock)

    const program = await generateProgram(INPUT, 'test-key', [{ id: 'exercise-row', name: 'Rowing' }])
    const firstBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))
    fetchMock.mockClear()
    await generateProgram({ ...INPUT, gender: 'male' }, 'test-key', [{ id: 'exercise-row', name: 'Rowing' }])
    const secondBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))

    expect(program.days[0].exercises[0]).toMatchObject({
      custom_name: 'Rowing',
      exercise_id: 'exercise-row',
    })
    expect(firstBody.system).toBe(secondBody.system)
    expect(firstBody.messages).toEqual(secondBody.messages)
  })
})
