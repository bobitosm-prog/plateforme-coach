import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { AiProvider } from '@/lib/ai/provider'
import { generateSeedanceText } from '@/lib/seedance/anthropic'

describe('Seedance Anthropic boundary', () => {
  it('uses the common provider with the existing model and prompt contract', async () => {
    const generate = vi.fn().mockResolvedValue({
      ok: true,
      output: 'text',
      value: 'synthetic prompt',
      metadata: {
        correlationId: 'seedance-correlation',
        requestedModel: 'claude-haiku-4-5-20251001',
        actualModel: 'claude-haiku-4-5-20251001',
        stopReason: 'end_turn',
      },
    })
    const createProvider = vi.fn(() => ({ generate } as unknown as AiProvider))

    const result = await generateSeedanceText({
      apiKey: 'synthetic-key',
      correlationId: 'seedance-correlation',
      maxTokens: 400,
      prompt: 'synthetic prompt input',
    }, { createProvider })

    expect(result).toMatchObject({ ok: true, value: 'synthetic prompt' })
    expect(createProvider).toHaveBeenCalledWith('synthetic-key')
    expect(generate).toHaveBeenCalledWith({
      output: 'text',
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 400,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'synthetic prompt input' }] }],
    }, {
      correlationId: 'seedance-correlation',
      timeoutMs: 300_000,
      cancellation: undefined,
    })
  })
})
