import { AI_PROVIDER_LIMITS, type AiGenerateRequest, type AiResultMetadata, type AiStopReason, type AiTokenUsage, type AiValidationResult } from './types'

const CORRELATION_ID = /^[A-Za-z0-9._:-]+$/
const MODEL_ID = /^[A-Za-z0-9._:/-]+$/

export type AiRequestValidation = { ok: true } | { ok: false; field: 'correlationId' | 'model' | 'maxTokens' | 'timeoutMs' | 'system' | 'messages' | 'temperature' | 'tools' }

export function validateAiRequest<T>(request: AiGenerateRequest<T>, context: { correlationId: string; timeoutMs: number }): AiRequestValidation {
  if (!context.correlationId || context.correlationId.length > AI_PROVIDER_LIMITS.correlationIdLength || !CORRELATION_ID.test(context.correlationId)) return { ok: false, field: 'correlationId' }
  if (!request.model || request.model.length > 256 || !MODEL_ID.test(request.model)) return { ok: false, field: 'model' }
  if (!Number.isInteger(request.maxTokens) || request.maxTokens < 1 || request.maxTokens > AI_PROVIDER_LIMITS.maxTokens) return { ok: false, field: 'maxTokens' }
  if (!Number.isFinite(context.timeoutMs) || context.timeoutMs < 1 || context.timeoutMs > AI_PROVIDER_LIMITS.maxTimeoutMs) return { ok: false, field: 'timeoutMs' }
  if (request.system !== undefined && request.system.length > AI_PROVIDER_LIMITS.maxSystemCharacters) return { ok: false, field: 'system' }
  if (request.temperature !== undefined && (!Number.isFinite(request.temperature) || request.temperature < 0 || request.temperature > 1)) return { ok: false, field: 'temperature' }
  if (!request.messages.length || request.messages.length > AI_PROVIDER_LIMITS.maxMessages) return { ok: false, field: 'messages' }

  for (const message of request.messages) {
    if (!message.content.length) return { ok: false, field: 'messages' }
    for (const block of message.content) {
      if (block.type === 'text' && block.text.length > AI_PROVIDER_LIMITS.maxTextBlockCharacters) return { ok: false, field: 'messages' }
      if (block.type === 'image' && (!block.dataBase64 || block.dataBase64.length > AI_PROVIDER_LIMITS.maxImageBase64Characters)) return { ok: false, field: 'messages' }
    }
  }

  if (request.output === 'tool') {
    if (!request.tools.length || request.tools.length > AI_PROVIDER_LIMITS.maxTools) return { ok: false, field: 'tools' }
    const names = new Set<string>()
    for (const tool of request.tools) {
      if (!tool.name || tool.name.length > AI_PROVIDER_LIMITS.maxToolNameCharacters || names.has(tool.name)) return { ok: false, field: 'tools' }
      names.add(tool.name)
    }
    if (request.forcedTool && !names.has(request.forcedTool)) return { ok: false, field: 'tools' }
  }
  return { ok: true }
}

export function validateStructuredOutput<T>(input: unknown, validate: (input: unknown) => AiValidationResult<T>): AiValidationResult<T> {
  try {
    const result = validate(input)
    return result.ok ? { ok: true, value: result.value } : { ok: false }
  } catch {
    return { ok: false }
  }
}

export function normalizeTokenUsage(input: AiTokenUsage | undefined): AiTokenUsage | undefined {
  if (!input) return undefined
  const output: AiTokenUsage = {}
  for (const key of ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens'] as const) {
    const value = input[key]
    if (value !== undefined && Number.isInteger(value) && value >= 0) output[key] = value
  }
  return Object.keys(output).length ? output : undefined
}

export function normalizeMetadata(input: AiResultMetadata): AiResultMetadata {
  return {
    correlationId: normalizeCorrelationId(input.correlationId),
    requestedModel: normalizeModelId(input.requestedModel),
    actualModel: normalizeModelId(input.actualModel),
    stopReason: normalizeStopReason(input.stopReason),
    usage: normalizeTokenUsage(input.usage),
  }
}

export function normalizeCorrelationId(input: string): string {
  return input.length <= AI_PROVIDER_LIMITS.correlationIdLength && CORRELATION_ID.test(input) ? input : 'invalid-correlation-id'
}

export function normalizeModelId(input: string): string {
  return input.length <= 256 && MODEL_ID.test(input) ? input : 'unknown-model'
}

export function normalizeStopReason(input: AiStopReason): AiStopReason {
  return ['end_turn', 'max_tokens', 'tool_use', 'refusal', 'unknown'].includes(input) ? input : 'unknown'
}
