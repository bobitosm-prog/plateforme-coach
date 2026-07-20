export type AiPromptRole = 'user' | 'assistant'

export interface AiPromptMessage {
  readonly role: AiPromptRole
  readonly content: unknown
}

export interface AiPromptInvocation {
  readonly model: string
  readonly max_tokens: number
  readonly system?: string
  readonly messages: readonly AiPromptMessage[]
  readonly temperature?: number
  readonly tool_choice?: Readonly<Record<string, unknown>>
  readonly tools?: readonly Readonly<Record<string, unknown>>[]
}

export type AiPromptBuildResult =
  | { readonly ok: true; readonly invocation: AiPromptInvocation }
  | { readonly ok: false; readonly reason: 'invalid_input' }

export function immutableInvocation(invocation: AiPromptInvocation): AiPromptInvocation {
  return deepFreeze(invocation)
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested)
    Object.freeze(value)
  }
  return value
}
