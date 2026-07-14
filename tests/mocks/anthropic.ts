import { beforeEach, vi } from 'vitest'

type Mode = { status: number; body: unknown; malformed?: boolean }
let queue: Mode[] = []
export const anthropicCalls: Array<{ url: string; model?: string; system?: string; messages?: unknown }> = []

function next(body: Record<string, unknown>, url = 'sdk://messages') {
  anthropicCalls.push({ url, model: String(body.model || ''), system: typeof body.system === 'string' ? '[REDACTED_SYSTEM_PROMPT]' : undefined, messages: body.messages })
  const mode = queue.shift()
  if (!mode) throw new Error('Unexpected Anthropic operation: configure a response first')
  if (mode.status >= 400) throw Object.assign(new Error(`Synthetic Anthropic ${mode.status}`), { status: mode.status })
  return mode.body
}

export const anthropicMock = {
  constructor: vi.fn(function AnthropicMock() { return { messages: { create: (body: Record<string, unknown>) => next(body) } } }),
  text(text = 'Réponse Anthropic synthétique') { queue.push({ status: 200, body: { content: [{ type: 'text', text }] } }) },
  tool(input: Record<string, unknown>) { queue.push({ status: 200, body: { content: [{ type: 'tool_use', id: 'tool_test_1', name: 'synthetic_tool', input }] } }) },
  malformed() { queue.push({ status: 200, body: '{malformed', malformed: true }) },
  fail(status: 429 | 500) { queue.push({ status, body: { type: 'error' } }) },
  fetch: vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    if (new URL(url).hostname !== 'api.anthropic.com') throw new Error(`Unexpected network access: ${url}`)
    const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>
    anthropicCalls.push({ url, model: String(body.model || ''), system: typeof body.system === 'string' ? '[REDACTED_SYSTEM_PROMPT]' : undefined, messages: body.messages })
    const mode = queue.shift()
    if (!mode) throw new Error('Unexpected Anthropic fetch: configure a response first')
    if (mode.malformed) return new Response(String(mode.body), { status: mode.status, headers: { 'content-type': 'application/json' } })
    return Response.json(mode.body, { status: mode.status })
  }),
  reset() { queue = []; anthropicCalls.length = 0; this.constructor.mockClear(); this.fetch.mockClear() },
}
beforeEach(() => anthropicMock.reset())
