import type { MealGenerationProvider } from './types'

interface AnthropicPayload { content?: Array<{ type?: string; text?: unknown }> }

export function createAnthropicMealGenerationProvider(options: {
  apiKey: string
  fetchImpl?: typeof fetch
}): MealGenerationProvider {
  const fetchImpl = options.fetchImpl ?? fetch
  return {
    async generate(request) {
      try {
        const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': options.apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: request.model, max_tokens: request.maxTokens, system: request.system, messages: [{ role: 'user', content: request.user }] }),
        })
        if (response.status === 429) return { ok: false, reason: 'PROVIDER_RATE_LIMITED' }
        if (!response.ok) return { ok: false, reason: 'PROVIDER_UNAVAILABLE' }
        const data = await response.json() as AnthropicPayload
        const text = data.content?.[0]?.text
        return typeof text === 'string' && text.trim()
          ? { ok: true, text }
          : { ok: false, reason: 'PROVIDER_INVALID_RESPONSE' }
      } catch (error) {
        return { ok: false, reason: error instanceof DOMException && error.name === 'AbortError' ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE' }
      }
    },
  }
}
