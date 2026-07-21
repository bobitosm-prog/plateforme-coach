import 'server-only'

import { aiFailure, normalizeAiProviderError, normalizeMetadata, validateAiRequest, validateStructuredOutput } from '@/lib/ai/provider'
import type { AiGenerateRequest, AiProvider, AiRequestContext, AiResult, AiResultMetadata, AiStopReason, AiStreamEvent, AiTokenUsage } from '@/lib/ai/provider'
import { parseAiJson, parseAiToolUse, unwrapLegacyToolInput } from '@/lib/ai/parsing'

import type { AnthropicFetch, AnthropicProviderOptions } from './types'

const DEFAULT_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'

type RecordValue = Record<string, unknown>

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stopReason(value: unknown): AiStopReason {
  if (value === 'end_turn' || value === 'max_tokens' || value === 'tool_use') return value
  if (value === 'refusal') return 'refusal'
  return 'unknown'
}

function usageOf(value: unknown): AiTokenUsage | undefined {
  if (!isRecord(value)) return undefined
  const usage: AiTokenUsage = {}
  const inputTokens = value.input_tokens
  const outputTokens = value.output_tokens
  const cacheReadTokens = value.cache_read_input_tokens
  const cacheWriteTokens = value.cache_creation_input_tokens
  if (Number.isInteger(inputTokens) && Number(inputTokens) >= 0) usage.inputTokens = Number(inputTokens)
  if (Number.isInteger(outputTokens) && Number(outputTokens) >= 0) usage.outputTokens = Number(outputTokens)
  if (Number.isInteger(cacheReadTokens) && Number(cacheReadTokens) >= 0) usage.cacheReadTokens = Number(cacheReadTokens)
  if (Number.isInteger(cacheWriteTokens) && Number(cacheWriteTokens) >= 0) usage.cacheWriteTokens = Number(cacheWriteTokens)
  return Object.keys(usage).length ? usage : undefined
}

function anthropicBlocks(request: AiGenerateRequest<unknown>) {
  return request.messages.map(message => ({
    role: message.role,
    content: message.content.length === 1 && message.content[0]?.type === 'text'
      ? message.content[0].text
      : message.content.map(block => block.type === 'text'
      ? { type: 'text', text: block.text }
      : { type: 'image', source: { type: 'base64', media_type: block.mediaType, data: block.dataBase64 } }),
  }))
}

function requestBody(request: AiGenerateRequest<unknown>) {
  const body: RecordValue = { model: request.model, max_tokens: request.maxTokens, messages: anthropicBlocks(request) }
  if (request.system !== undefined) body.system = request.system
  if (request.temperature !== undefined) body.temperature = request.temperature
  if (request.output === 'tool') {
    body.tools = request.tools.map(tool => ({ name: tool.name, description: tool.description, input_schema: tool.inputSchema }))
    if (request.forcedTool) body.tool_choice = { type: 'tool', name: request.forcedTool }
  }
  return body
}

function firstText(response: RecordValue): string | null {
  if (!Array.isArray(response.content)) return null
  const block = response.content.find(item => isRecord(item) && item.type === 'text' && typeof item.text === 'string')
  return isRecord(block) ? String(block.text) : null
}

function providerFailure<T>(context: AiRequestContext, request: AiGenerateRequest<T>, status?: number, kind?: 'invalid_output' | 'cancelled') {
  const error = normalizeAiProviderError({ status, kind })
  return aiFailure<T>({ ...error, correlationId: context.correlationId, requestedModel: request.model })
}

function invalidOutputFailure<T>(metadata: AiResultMetadata): AiResult<T> & { ok: false } {
  return { ok: false, error: { code: 'invalid_output', retryable: false }, metadata }
}

export function createAnthropicProvider(options: AnthropicProviderOptions): AiProvider {
  const fetchImpl: AnthropicFetch = options.fetchImpl ?? (fetch as unknown as AnthropicFetch)
  const messagesUrl = options.messagesUrl ?? DEFAULT_MESSAGES_URL

  async function generate<T>(request: AiGenerateRequest<T>, context: AiRequestContext): Promise<AiResult<T>> {
    if (!options.apiKey.trim() || !validateAiRequest(request, context).ok) return providerFailure(context, request)
    if (context.cancellation?.aborted) return providerFailure(context, request, undefined, 'cancelled')
    const controller = new AbortController()
    const unsubscribe = context.cancellation?.subscribe(() => controller.abort())
    try {
      const response = await fetchImpl(messagesUrl, {
        method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json', 'x-api-key': options.apiKey.trim(), 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(requestBody(request)),
      })
      if (!response.ok) return providerFailure(context, request, response.status)
      const raw = await response.json()
      if (!isRecord(raw)) return providerFailure(context, request, undefined, 'invalid_output')
      if (raw.stop_reason === 'refusal') {
        const normalized = normalizeAiProviderError({ kind: 'refusal' })
        return aiFailure<T>({ ...normalized, correlationId: context.correlationId, requestedModel: request.model })
      }
      const metadata = normalizeMetadata({
        correlationId: context.correlationId,
        requestedModel: request.model,
        actualModel: typeof raw.model === 'string' ? raw.model : request.model,
        stopReason: stopReason(raw.stop_reason),
        usage: usageOf(raw.usage),
      })
      if (request.output === 'text') {
        const text = firstText(raw)
        return text === null ? providerFailure(context, request, undefined, 'invalid_output') : { ok: true, output: 'text', value: text as T, metadata }
      }
      if (request.output === 'json') {
        const text = firstText(raw)
        if (text === null) return invalidOutputFailure(metadata)
        const parsed = parseAiJson(text, { allowMarkdownFence: true, allowLegacySurroundingText: true })
        if (!parsed.ok) return invalidOutputFailure(metadata)
        const validated = validateStructuredOutput(parsed.value, request.validate)
        return validated.ok ? { ok: true, output: 'json', value: validated.value, metadata } : invalidOutputFailure(metadata)
      }
      const parsedTool = parseAiToolUse(raw, request.forcedTool ?? request.tools[0]?.name ?? '')
      if (!parsedTool.ok) return invalidOutputFailure(metadata)
      const unwrapped = unwrapLegacyToolInput(parsedTool.value.input)
      if (!unwrapped.ok) return invalidOutputFailure(metadata)
      const validated = validateStructuredOutput(unwrapped.value, request.validate)
      return validated.ok ? { ok: true, output: 'tool', value: validated.value, metadata } : invalidOutputFailure(metadata)
    } catch (error) {
      if (controller.signal.aborted || context.cancellation?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        return providerFailure(context, request, undefined, 'cancelled')
      }
      if (error instanceof Error && error.name === 'TimeoutError') {
        const normalized = normalizeAiProviderError({ kind: 'timeout' })
        return aiFailure<T>({ ...normalized, correlationId: context.correlationId, requestedModel: request.model })
      }
      const normalized = normalizeAiProviderError({ kind: 'network' })
      return aiFailure<T>({ ...normalized, correlationId: context.correlationId, requestedModel: request.model })
    } finally {
      unsubscribe?.()
    }
  }

  async function* unsupportedStream<T>(request: AiGenerateRequest<T>, context: AiRequestContext): AsyncIterable<AiStreamEvent<T>> {
    yield { type: 'failed', result: providerFailure(context, request), partial: false }
  }

  return {
    generate: generate as AiProvider['generate'],
    stream: unsupportedStream,
  } as AiProvider
}
