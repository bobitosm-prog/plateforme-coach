import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { AiProvider, AiResult, AiToolRequest } from '@/lib/ai/provider'
import { generateProgram } from '@/lib/training/generate-program'
import { validModernProgramOutput } from '@/tests/fixtures/ai-output-schemas'

const input = {
  objective: 'force', level: 'intermediaire', daysPerWeek: 3, duration: 60,
  equipment: 'salle', priorities: ['dos'], notes: 'progressif', gender: 'male',
}

function providerReturning(result: AiResult<typeof validModernProgramOutput>) {
  const generate = vi.fn(async (request: unknown, context: unknown) => {
    void request
    void context
    return result
  })
  return { provider: { generate } as unknown as AiProvider, generate }
}

describe('Training program generation through AiProvider', () => {
  it('preserves the exact modern tool contract and reports provider metadata', async () => {
    const success = {
      ok: true as const, output: 'tool' as const, value: structuredClone(validModernProgramOutput),
      metadata: { correlationId: 'training-1', requestedModel: 'claude-opus-4-8', actualModel: 'claude-opus-4-8', stopReason: 'tool_use' as const, usage: { inputTokens: 30, outputTokens: 20 } },
    }
    const { provider, generate } = providerReturning(success)
    const metadata = vi.fn()
    const result = await generateProgram(input, { provider, correlationId: 'training-1' }, [], metadata)

    expect(result).toEqual(validModernProgramOutput)
    const request = generate.mock.calls[0]?.[0] as AiToolRequest<typeof validModernProgramOutput>
    expect(request).toMatchObject({ output: 'tool', model: 'claude-opus-4-8', maxTokens: 8000, forcedTool: 'generate_program' })
    expect(request.tools).toHaveLength(1)
    expect(request.tools[0]).toMatchObject({ name: 'generate_program', inputSchema: { type: 'object' } })
    expect(request.system).toContain('Notes supplementaires : progressif')
    expect(generate.mock.calls[0]?.[1]).toEqual({ correlationId: 'training-1', timeoutMs: 300_000, cancellation: undefined })
    expect(metadata).toHaveBeenCalledWith({ providerModel: 'claude-opus-4-8', tokens: { inputTokens: 30, outputTokens: 20 } })
  })

  it('resolves catalog references immutably after validated generation', async () => {
    const generated = structuredClone(validModernProgramOutput)
    const snapshot = structuredClone(generated)
    const { provider } = providerReturning({
      ok: true, output: 'tool', value: generated,
      metadata: { correlationId: 'training-2', requestedModel: 'claude-opus-4-8', actualModel: 'claude-opus-4-8', stopReason: 'tool_use' },
    })
    const catalog = [{ id: 'exercise-1', name: 'Développé couché' }]
    const result = await generateProgram(input, { provider, correlationId: 'training-2' }, catalog)
    expect(result.days[0].exercises[0]).toMatchObject({ exercise_id: 'exercise-1', custom_name: 'Développé couché' })
    expect(generated).toEqual(snapshot)
    expect(catalog).toEqual([{ id: 'exercise-1', name: 'Développé couché' }])
  })

  it.each(['invalid_output', 'quota_exceeded', 'timeout', 'network_error', 'provider_refused', 'cancelled'] as const)(
    'keeps %s failures typed and sanitized', async code => {
      const { provider } = providerReturning({ ok: false, error: { code, retryable: code !== 'invalid_output' }, metadata: { correlationId: 'training-safe', requestedModel: 'claude-opus-4-8' } })
      const failure = generateProgram(input, { provider, correlationId: 'training-safe' })
      await expect(failure).rejects.toMatchObject({ name: 'TrainingProgramGenerationError', code })
      await expect(failure).rejects.not.toThrow(/prompt|secret|payload/i)
    },
  )
})
