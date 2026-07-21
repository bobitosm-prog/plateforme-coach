import type { AiRecordedTokens } from './types'

export function readAnthropicMetadata(value: unknown): { providerModel?: string; tokens?: AiRecordedTokens } {
  if (!isRecord(value)) return {}
  const usage = isRecord(value.usage) ? value.usage : undefined
  const inputTokens = nonnegativeInteger(usage?.input_tokens)
  const outputTokens = nonnegativeInteger(usage?.output_tokens)
  return {
    providerModel: typeof value.model === 'string' && value.model.length <= 256 ? value.model : undefined,
    tokens: inputTokens === undefined && outputTokens === undefined ? undefined : { inputTokens, outputTokens },
  }
}

function nonnegativeInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
