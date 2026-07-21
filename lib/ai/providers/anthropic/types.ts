export interface AnthropicHttpResponse {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
}

export type AnthropicFetch = (
  input: string,
  init: { method: 'POST'; headers: Readonly<Record<string, string>>; body: string; signal: AbortSignal },
) => Promise<AnthropicHttpResponse>

export interface AnthropicProviderOptions {
  apiKey: string
  messagesUrl?: string
  fetchImpl?: AnthropicFetch
}
