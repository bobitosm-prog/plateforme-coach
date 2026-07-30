export interface AnthropicHttpResponse {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
  text?(): Promise<string>
}

export type AnthropicFetch = (
  input: string,
  init: { method: 'POST'; headers: Readonly<Record<string, string>>; body: string; signal: AbortSignal },
) => Promise<AnthropicHttpResponse>

export interface AnthropicProviderFailureLog {
  readonly event: 'AI_PROVIDER_FAILURE'
  readonly provider: 'anthropic'
  readonly status: number
  readonly providerErrorType: string
  readonly providerErrorCode?: string
  readonly requestedModel: string
  readonly correlationId: string
}

export interface AnthropicProviderOptions {
  apiKey: string
  messagesUrl?: string
  fetchImpl?: AnthropicFetch
  failureLogger?: (record: AnthropicProviderFailureLog) => void
}
