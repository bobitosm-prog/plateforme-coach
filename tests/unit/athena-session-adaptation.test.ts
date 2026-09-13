import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  estimateAdaptedSessionMinutes,
  generateSessionAdaptation,
  sessionAdaptationRequestSchema,
  SessionAdaptationError,
  type AdaptedSessionExercise,
  validateSessionAdaptationOutput,
} from '@/lib/athena/session-adaptation'

const RAW_REQUEST = {
  availableMinutes: 25,
  sessionType: 'upper',
  exercises: [
    { name: 'Développé couché', sets: 4, reps: 8, rest_seconds: 150 },
    { exercise_name: 'Rowing', sets: 4, reps: '8-10', rest_seconds: 150 },
    { name: 'Élévations latérales', sets: 3, reps: 15, rest_seconds: 75 },
  ],
}

const REQUEST = sessionAdaptationRequestSchema.parse(RAW_REQUEST)

const VALID_OUTPUT = {
  exercises: [
    { name: 'Développé couché', sets: 3, reps: '8', rest_seconds: 150, priority: 'haute', kept: true },
    { name: 'Rowing', sets: 3, reps: '8-10', rest_seconds: 150, priority: 'haute', kept: true },
    { name: 'Élévations latérales', sets: 0, reps: '15', rest_seconds: 75, priority: 'moyenne', kept: false },
  ],
} satisfies { exercises: AdaptedSessionExercise[] }

describe('Athena session adaptation', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('normalizes the existing session without accepting extra request controls', () => {
    expect(REQUEST.exercises[0]).toEqual({
      name: 'Développé couché',
      sets: 4,
      reps: '8',
      restSeconds: 150,
    })
    expect(sessionAdaptationRequestSchema.safeParse({
      ...RAW_REQUEST,
      role: 'system',
    }).success).toBe(false)
  })

  it('accepts reductions that preserve names, repetitions and rest', () => {
    expect(validateSessionAdaptationOutput(VALID_OUTPUT, REQUEST)).toEqual(VALID_OUTPUT.exercises)
    expect(estimateAdaptedSessionMinutes(VALID_OUTPUT.exercises)).toBeLessThanOrEqual(REQUEST.availableMinutes)
  })

  it.each([
    ['invented exercise', { name: 'Burpees' }],
    ['increased sets', { sets: 5 }],
    ['changed repetitions', { reps: '20' }],
    ['shortened rest', { rest_seconds: 30 }],
    ['removed exercise with non-zero sets', { kept: false, sets: 2 }],
  ])('rejects an adaptation with %s', (_label, override) => {
    const output = structuredClone(VALID_OUTPUT)
    Object.assign(output.exercises[0], override)

    expect(() => validateSessionAdaptationOutput(output, REQUEST)).toThrow(SessionAdaptationError)
  })

  it('rejects omissions and duplicates', () => {
    const omitted = structuredClone(VALID_OUTPUT)
    omitted.exercises.pop()
    expect(() => validateSessionAdaptationOutput(omitted, REQUEST)).toThrow(SessionAdaptationError)

    const duplicate = structuredClone(VALID_OUTPUT)
    duplicate.exercises[1].name = duplicate.exercises[0].name
    expect(() => validateSessionAdaptationOutput(duplicate, REQUEST)).toThrow(SessionAdaptationError)
  })

  it('rejects an adaptation that still exceeds the available time', () => {
    const unchanged = {
      exercises: REQUEST.exercises.map(exercise => ({
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        rest_seconds: exercise.restSeconds,
        priority: 'haute' as const,
        kept: true,
      })),
    }

    expect(estimateAdaptedSessionMinutes(unchanged.exercises)).toBeGreaterThan(REQUEST.availableMinutes)
    expect(() => validateSessionAdaptationOutput(unchanged, REQUEST)).toThrow(SessionAdaptationError)
  })

  it('uses structured output and sends source data as non-instructional JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      content: [{ type: 'tool_use', input: VALID_OUTPUT }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateSessionAdaptation(REQUEST, 'test-key')
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))

    expect(result).toEqual(VALID_OUTPUT.exercises)
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'adapt_session' })
    expect(body.system).toContain("N'augmente jamais les séries")
    expect(body.system).toContain('Ne modifie ni les répétitions ni les temps de repos')
    expect(body.messages[0].content).toContain('<session_adaptation_request>')
  })

  it('fails closed on an upstream or malformed model response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))
    await expect(generateSessionAdaptation(REQUEST, 'test-key')).rejects.toMatchObject({ code: 'upstream' })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [] }), { status: 200 })))
    await expect(generateSessionAdaptation(REQUEST, 'test-key')).rejects.toMatchObject({ code: 'invalid_model_output' })
  })
})
