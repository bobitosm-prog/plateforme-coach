export const AI_PROVIDER_LIMITS = {
  correlationIdLength: 128,
  maxSystemCharacters: 100_000,
  maxMessages: 100,
  maxTextBlockCharacters: 200_000,
  maxImageBase64Characters: 14_000_000,
  maxTools: 32,
  maxToolNameCharacters: 128,
  maxTokens: 100_000,
  maxTimeoutMs: 300_000,
} as const

export type AiOutputKind = 'text' | 'json' | 'tool'
export type AiStopReason = 'end_turn' | 'max_tokens' | 'tool_use' | 'refusal' | 'unknown'

export interface AiTokenUsage {
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

export interface AiResultMetadata {
  correlationId: string
  requestedModel: string
  actualModel: string
  stopReason: AiStopReason
  usage?: AiTokenUsage
}

export type AiErrorCode =
  | 'provider_refused'
  | 'quota_exceeded'
  | 'timeout'
  | 'network_error'
  | 'invalid_output'
  | 'unexpected_error'
  | 'cancelled'

export interface AiSafeError {
  code: AiErrorCode
  retryable: boolean
}

export type AiResult<T> =
  | { ok: true; output: AiOutputKind; value: T; metadata: AiResultMetadata }
  | { ok: false; error: AiSafeError; metadata: Omit<AiResultMetadata, 'actualModel' | 'stopReason'> & Partial<Pick<AiResultMetadata, 'actualModel' | 'stopReason' | 'usage'>> }

export interface AiTextBlock {
  type: 'text'
  text: string
}

export interface AiImageBlock {
  type: 'image'
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  dataBase64: string
}

export type AiInputBlock = AiTextBlock | AiImageBlock

export interface AiMessage {
  role: 'user' | 'assistant'
  content: readonly AiInputBlock[]
}

export interface AiToolDefinition {
  name: string
  description?: string
  inputSchema: Readonly<Record<string, unknown>>
}

export type AiValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false }

export type AiOutputValidator<T> = (input: unknown) => AiValidationResult<T>

interface AiRequestBase {
  model: string
  maxTokens: number
  system?: string
  messages: readonly AiMessage[]
  temperature?: number
}

export interface AiTextRequest extends AiRequestBase {
  output: 'text'
}

export interface AiJsonRequest<T> extends AiRequestBase {
  output: 'json'
  validate: AiOutputValidator<T>
}

export interface AiToolRequest<T> extends AiRequestBase {
  output: 'tool'
  tools: readonly AiToolDefinition[]
  forcedTool?: string
  validate: AiOutputValidator<T>
}

export type AiGenerateRequest<T = string> = AiTextRequest | AiJsonRequest<T> | AiToolRequest<T>

export interface AiCancellationSignal {
  readonly aborted: boolean
  subscribe(listener: () => void): () => void
}

export interface AiRequestContext {
  correlationId: string
  timeoutMs: number
  cancellation?: AiCancellationSignal
}

export type AiStreamEvent<T> =
  | { type: 'started'; metadata: Pick<AiResultMetadata, 'correlationId' | 'requestedModel'> }
  | { type: 'text_delta'; value: string }
  | { type: 'structured_delta'; value: unknown }
  | { type: 'usage'; usage: AiTokenUsage }
  | { type: 'completed'; result: AiResult<T> & { ok: true } }
  | { type: 'failed'; result: AiResult<never> & { ok: false }; partial: boolean }

export interface AiProvider {
  generate(request: AiTextRequest, context: AiRequestContext): Promise<AiResult<string>>
  generate<T>(request: AiJsonRequest<T> | AiToolRequest<T>, context: AiRequestContext): Promise<AiResult<T>>
  stream(request: AiTextRequest, context: AiRequestContext): AsyncIterable<AiStreamEvent<string>>
  stream<T>(request: AiJsonRequest<T> | AiToolRequest<T>, context: AiRequestContext): AsyncIterable<AiStreamEvent<T>>
}

export interface AiClock {
  now(): number
}

export interface AiTimeoutScheduler {
  schedule(callback: () => void, delayMs: number): unknown
  cancel(handle: unknown): void
}
