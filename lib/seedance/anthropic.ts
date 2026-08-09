import 'server-only'

import type { AiProvider, AiResult } from '@/lib/ai/provider'
import { abortSignalToAiCancellation, createAnthropicProvider } from '@/lib/ai/providers/anthropic'
import { getAnthropicMessagesUrl } from '@/lib/anthropic/chat-transport'

type SeedanceTextInput = {
  apiKey: string
  correlationId: string
  maxTokens: number
  prompt: string
  signal?: AbortSignal
}

type SeedanceAnthropicDependencies = {
  createProvider?: (apiKey: string) => AiProvider
}

const SEEDANCE_PROMPT_MODEL = 'claude-haiku-4-5-20251001'

export function generateSeedanceText(
  input: SeedanceTextInput,
  dependencies: SeedanceAnthropicDependencies = {},
): Promise<AiResult<string>> {
  const provider = dependencies.createProvider?.(input.apiKey)
    ?? createAnthropicProvider({ apiKey: input.apiKey, messagesUrl: getAnthropicMessagesUrl() })

  return provider.generate({
    output: 'text',
    model: SEEDANCE_PROMPT_MODEL,
    maxTokens: input.maxTokens,
    messages: [{ role: 'user', content: [{ type: 'text', text: input.prompt }] }],
  }, {
    correlationId: input.correlationId,
    timeoutMs: 300_000,
    cancellation: input.signal ? abortSignalToAiCancellation(input.signal) : undefined,
  })
}
