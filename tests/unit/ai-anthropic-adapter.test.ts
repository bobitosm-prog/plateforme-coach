import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { createAiCancellationController } from '@/lib/ai/provider'
import { createAnthropicProvider } from '@/lib/ai/providers/anthropic'

const context = { correlationId: 'correlation-1', timeoutMs: 30_000 }
const textRequest = {
  output: 'text' as const,
  model: 'claude-sonnet-4-6',
  maxTokens: 1024,
  system: 'system exact',
  messages: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'question exacte' }] }],
}

describe('Anthropic AiProvider adapter', () => {
  const calls: Array<{ url: string; body: Record<string, unknown>; headers: Readonly<Record<string, string>>; signal: AbortSignal }> = []
  let response: { ok: boolean; status: number; body: unknown }
  const fetchImpl = vi.fn(async (url: string, init: { headers: Readonly<Record<string, string>>; body: string; signal: AbortSignal }) => {
    calls.push({ url, body: JSON.parse(init.body), headers: init.headers, signal: init.signal })
    return { ok: response.ok, status: response.status, async json() { return response.body } }
  })

  beforeEach(() => {
    calls.length = 0
    response = { ok: true, status: 200, body: { model: 'claude-sonnet-4-6', stop_reason: 'end_turn', usage: { input_tokens: 12, output_tokens: 4 }, content: [{ type: 'text', text: 'réponse' }] } }
    fetchImpl.mockClear()
  })

  it('sends the exact text request and returns sanitized metadata', async () => {
    const provider = createAnthropicProvider({ apiKey: 'secret-key', messagesUrl: 'http://127.0.0.1:55330/v1/messages', fetchImpl })
    await expect(provider.generate(textRequest, context)).resolves.toEqual({
      ok: true, output: 'text', value: 'réponse',
      metadata: { correlationId: 'correlation-1', requestedModel: 'claude-sonnet-4-6', actualModel: 'claude-sonnet-4-6', stopReason: 'end_turn', usage: { inputTokens: 12, outputTokens: 4 } },
    })
    expect(calls[0]).toMatchObject({
      url: 'http://127.0.0.1:55330/v1/messages',
      body: { model: 'claude-sonnet-4-6', max_tokens: 1024, system: 'system exact', messages: [{ role: 'user', content: 'question exacte' }] },
      headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01' },
    })
    expect(calls[0]?.headers['x-api-key']).toBe('secret-key')
  })

  it('parses and validates JSON without exposing invalid content', async () => {
    response.body = { model: 'claude-haiku-4-5-20251001', stop_reason: 'end_turn', content: [{ type: 'text', text: '```json\n{"value":2}\n```' }] }
    const provider = createAnthropicProvider({ apiKey: 'key', fetchImpl })
    const request = { ...textRequest, output: 'json' as const, model: 'claude-haiku-4-5-20251001', validate: (input: unknown) => typeof input === 'object' && input !== null && (input as { value?: unknown }).value === 2 ? { ok: true as const, value: input as { value: number } } : { ok: false as const } }
    await expect(provider.generate(request, context)).resolves.toMatchObject({ ok: true, output: 'json', value: { value: 2 } })
    response.body = { model: 'claude-haiku-4-5-20251001', stop_reason: 'end_turn', usage: { input_tokens: 8, output_tokens: 3 }, content: [{ type: 'text', text: '{"secret":"raw"}' }] }
    const invalid = await provider.generate(request, context)
    expect(invalid).toMatchObject({ ok: false, error: { code: 'invalid_output', retryable: false }, metadata: { correlationId: 'correlation-1', requestedModel: 'claude-haiku-4-5-20251001' } })
    expect(invalid.metadata).toMatchObject({ actualModel: 'claude-haiku-4-5-20251001', usage: { inputTokens: 8, outputTokens: 3 } })
    expect(JSON.stringify(invalid)).not.toContain('secret')
  })

  it('preserves multimodal image/text block order and exact image metadata', async () => {
    response.body = { model: textRequest.model, stop_reason: 'end_turn', content: [{ type: 'text', text: '{"ok":true}' }] }
    const request = {
      ...textRequest,
      output: 'json' as const,
      messages: [{ role: 'user' as const, content: [
        { type: 'image' as const, mediaType: 'image/jpeg' as const, dataBase64: 'AQID' },
        { type: 'text' as const, text: 'analyse exacte' },
      ] }],
      validate: (input: unknown) => ({ ok: true as const, value: input }),
    }
    await createAnthropicProvider({ apiKey: 'key', fetchImpl }).generate(request, context)
    expect(calls[0]?.body).toMatchObject({ messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AQID' } },
      { type: 'text', text: 'analyse exacte' },
    ] }] })
  })

  it('supports one exact tool, rejects absent or ambiguous tools, and maps stop reasons', async () => {
    const request = { ...textRequest, output: 'tool' as const, tools: [{ name: 'recipe', inputSchema: { type: 'object' } }], forcedTool: 'recipe', validate: (input: unknown) => typeof input === 'object' && input !== null ? { ok: true as const, value: input } : { ok: false as const } }
    response.body = { model: textRequest.model, stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'recipe', input: { title: 'A' } }] }
    await expect(createAnthropicProvider({ apiKey: 'key', fetchImpl }).generate(request, context)).resolves.toMatchObject({ ok: true, output: 'tool', value: { title: 'A' }, metadata: { stopReason: 'tool_use' } })
    expect(calls[0]?.body).toMatchObject({ tools: [{ name: 'recipe', input_schema: { type: 'object' } }], tool_choice: { type: 'tool', name: 'recipe' } })
    response.body = { content: [] }
    await expect(createAnthropicProvider({ apiKey: 'key', fetchImpl }).generate(request, context)).resolves.toMatchObject({ ok: false, error: { code: 'invalid_output' } })
    response.body = { content: [{ type: 'tool_use', name: 'recipe', input: {} }, { type: 'tool_use', name: 'recipe', input: {} }] }
    await expect(createAnthropicProvider({ apiKey: 'key', fetchImpl }).generate(request, context)).resolves.toMatchObject({ ok: false, error: { code: 'invalid_output' } })
  })

  it.each([[429, 'quota_exceeded'], [500, 'network_error'], [403, 'provider_refused']] as const)('normalizes status %s', async (status, code) => {
    response = { ok: false, status, body: { prompt: 'must not leak' } }
    const result = await createAnthropicProvider({ apiKey: 'key', fetchImpl }).generate(textRequest, context)
    expect(result).toMatchObject({ ok: false, error: { code } })
    expect(JSON.stringify(result)).not.toContain('must not leak')
  })

  it('normalizes an explicit provider refusal without returning its content', async () => {
    response.body = { stop_reason: 'refusal', content: [{ type: 'text', text: 'private refusal' }] }
    const result = await createAnthropicProvider({ apiKey: 'key', fetchImpl }).generate(textRequest, context)
    expect(result).toMatchObject({ ok: false, error: { code: 'provider_refused', retryable: false } })
    expect(JSON.stringify(result)).not.toContain('private refusal')
  })

  it('propagates cancellation to the injected transport and cleans the listener', async () => {
    const cancellation = createAiCancellationController()
    const pendingFetch = vi.fn(async (_url: string, init: { signal: AbortSignal }) => new Promise<never>((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(Object.assign(new Error('private'), { name: 'AbortError' })), { once: true })
    }))
    const resultPromise = createAnthropicProvider({ apiKey: 'key', fetchImpl: pendingFetch }).generate(textRequest, { ...context, cancellation: cancellation.signal })
    expect(cancellation.abort()).toBe(true)
    await expect(resultPromise).resolves.toMatchObject({ ok: false, error: { code: 'cancelled' } })
  })

  it('normalizes network errors without provider messages', async () => {
    const result = await createAnthropicProvider({ apiKey: 'key', fetchImpl: async () => { throw new Error('secret provider payload') } }).generate(textRequest, context)
    expect(result).toMatchObject({ ok: false, error: { code: 'network_error' } })
    expect(JSON.stringify(result)).not.toContain('secret')
  })

  it('normalizes an injected transport timeout without adding retries', async () => {
    const timedOut = vi.fn(async () => { throw Object.assign(new Error('private timeout'), { name: 'TimeoutError' }) })
    const result = await createAnthropicProvider({ apiKey: 'key', fetchImpl: timedOut }).generate(textRequest, context)
    expect(result).toMatchObject({ ok: false, error: { code: 'timeout', retryable: true } })
    expect(timedOut).toHaveBeenCalledTimes(1)
  })
})
