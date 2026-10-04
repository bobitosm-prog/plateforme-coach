
// This suite exercises business behaviour after consent. The real privacy gate is
// covered separately by ai-consent-runtime.test.ts (no provider traffic on denial).
vi.mock('@/lib/ai/consent-server', () => ({
  withAiConsent: (handler: unknown) => handler,
  consentedAnthropicFetch: (...args: Parameters<typeof fetch>) => fetch(...args),
  withAiUser: (_db: unknown, _id: string, action: () => unknown) => action(),
  assertAiConsent: async () => {},
}))
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
            custom_name: ({ Rowing: 'Rowing haltères', Squat: 'Squat au poids du corps', Développé: 'Pompes au sol' } as Record<string, string>)[name],
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
  it('rejects ambiguous legacy names even for a gym program without a catalog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      const response = await anthropicResponse().json()
      response.content[0].input.days[0].exercises[0].custom_name = 'Rowing Barre'
      return new Response(JSON.stringify(response), {status:200})
    }))
    await expect(generateProgram({...INPUT,equipment:'salle'},'synthetic-key')).rejects.toThrow(/non conforme/)
  })
  it('rejects a provider response requiring undeclared equipment', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => anthropicResponse()))
    await expect(generateProgram({ ...INPUT, equipment: 'maison : bandes élastiques' }, 'test-key', [
      { id: 'exercise-row', name: 'Rowing haltères', equipment: 'dumbbell' },
    ])).rejects.toThrow(/non conforme/)
  })

  it('sends the normalized evidence policy and bounded tool schema', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => anthropicResponse())
    vi.stubGlobal('fetch', fetchMock)

    await generateProgram(INPUT, 'test-key', [{ id: 'exercise-row', name: 'Rowing haltères', equipment: 'dumbbell' }])

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

    const program = await generateProgram(INPUT, 'test-key', [{ id: 'exercise-row', name: 'Rowing haltères', equipment: 'dumbbell' }])
    const firstBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))
    fetchMock.mockClear()
    await generateProgram({ ...INPUT, gender: 'male' }, 'test-key', [{ id: 'exercise-row', name: 'Rowing haltères', equipment: 'dumbbell' }])
    const secondBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))

    expect(program.days[0].exercises[0]).toMatchObject({
      custom_name: 'Rowing haltères',
      exercise_id: 'exercise-row',
    })
    expect(firstBody.system).toBe(secondBody.system)
    expect(firstBody.messages).toEqual(secondBody.messages)
  })

  it('keeps an opted-in biset linked to its real catalog partner after name normalization', async () => {
    const response = await anthropicResponse().json()
    const firstDay = response.content[0].input.days[0]
    firstDay.exercises[0].technique = 'superset'
    firstDay.exercises[0].technique_details = 'squat au poids du corps'
    firstDay.exercises[1].custom_name = 'squat au poids du corps'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 })))

    const program = await generateProgram({ ...INPUT, level: 'intermediaire', equipment: 'salle', allowAdvancedTechniques: true }, 'test-key', [
      { id: 'row', name: 'Rowing haltères', equipment: 'dumbbell' },
      { id: 'squat', name: 'Squat au poids du corps', equipment: 'bodyweight' },
      { id: 'push', name: 'Pompes au sol', equipment: 'bodyweight' },
    ])
    expect(program.days[0].exercises[0].technique_details).toBe('Squat au poids du corps')
    expect(program.days[0].exercises[1]).toMatchObject({ custom_name: 'Squat au poids du corps', exercise_id: 'squat' })
  })

  it('rejects an AI biset that names a partner missing from the session', async () => {
    const response = await anthropicResponse().json()
    response.content[0].input.days[0].exercises[0].technique = 'superset'
    response.content[0].input.days[0].exercises[0].technique_details = 'Exercice absent'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 })))
    await expect(generateProgram({ ...INPUT, level: 'intermediaire', allowAdvancedTechniques: true }, 'test-key')).rejects.toThrow(/non conforme/)
  })
})
