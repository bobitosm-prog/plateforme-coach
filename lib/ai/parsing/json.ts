import type { AiJsonParsingOptions, AiStructuredParsingResult } from './types'
import { AI_STRUCTURED_OUTPUT_LIMITS } from './types'

const FENCE = /^```(?:json)?[ \t]*(?:\r?\n)?([\s\S]*?)(?:\r?\n)?```$/i

function findBalancedJson(input: string): string | null {
  const objectStart = input.indexOf('{')
  const arrayStart = input.indexOf('[')
  const start = objectStart < 0 ? arrayStart : arrayStart < 0 ? objectStart : Math.min(objectStart, arrayStart)
  if (start < 0) return null
  const opening = input[start]
  const closing = opening === '{' ? '}' : ']'
  const stack: string[] = []
  let quoted = false
  let escaped = false
  for (let index = start; index < input.length; index += 1) {
    const char = input[index]
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
      continue
    }
    if (char === '"') { quoted = true; continue }
    if (char === '{' || char === '[') stack.push(char)
    else if (char === '}' || char === ']') {
      const expected = char === '}' ? '{' : '['
      if (stack.pop() !== expected) return null
      if (stack.length === 0) return char === closing ? input.slice(start, index + 1) : null
    }
  }
  return null
}

export function parseAiJson(input: string, options: AiJsonParsingOptions = {}): AiStructuredParsingResult<unknown> {
  const maxCharacters = options.maxCharacters ?? AI_STRUCTURED_OUTPUT_LIMITS.maxInputCharacters
  if (!input.trim()) return { ok: false, error: { code: 'invalid_output', reason: 'empty_input' } }
  if (input.length > maxCharacters) return { ok: false, error: { code: 'invalid_output', reason: 'input_too_large' } }

  const trimmed = input.trim()
  const fence = trimmed.match(FENCE)
  if (fence && !options.allowMarkdownFence) return { ok: false, error: { code: 'invalid_output', reason: 'markdown_fence_not_allowed' } }
  let candidate = fence ? fence[1].trim() : trimmed

  if (!fence && options.allowLegacySurroundingText) {
    candidate = findBalancedJson(trimmed) ?? candidate
  } else if (!fence && candidate[0] !== '{' && candidate[0] !== '[') {
    return { ok: false, error: { code: 'invalid_output', reason: 'unexpected_surrounding_text' } }
  }

  try {
    return { ok: true, value: JSON.parse(candidate) as unknown }
  } catch {
    return { ok: false, error: { code: 'invalid_output', reason: 'invalid_json' } }
  }
}
