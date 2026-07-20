export const AI_STRUCTURED_OUTPUT_LIMITS = {
  maxInputCharacters: 200_000,
  maxPublicIssues: 8,
} as const

export type AiStructuredParsingReason =
  | 'empty_input'
  | 'input_too_large'
  | 'markdown_fence_not_allowed'
  | 'unexpected_surrounding_text'
  | 'invalid_json'
  | 'invalid_shape'
  | 'missing_tool_use'
  | 'ambiguous_tool_use'
  | 'wrong_tool_name'
  | 'invalid_tool_input'
  | 'excessive_tool_input_wrapping'

export interface AiStructuredParsingError {
  code: 'invalid_output'
  reason: AiStructuredParsingReason
  issueCount?: number
  fields?: readonly string[]
}

export type AiStructuredParsingResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AiStructuredParsingError }

export interface AiJsonParsingOptions {
  maxCharacters?: number
  allowMarkdownFence?: boolean
  allowLegacySurroundingText?: boolean
}

export interface AiToolUseBlock {
  type: 'tool_use'
  name: string
  input: unknown
}
