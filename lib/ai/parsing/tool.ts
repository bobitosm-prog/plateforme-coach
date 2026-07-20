import type { AiStructuredParsingResult, AiToolUseBlock } from './types'

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
}

export function parseAiToolUse(input: unknown, expectedName: string): AiStructuredParsingResult<AiToolUseBlock> {
  if (!isRecord(input) || !Array.isArray(input.content)) {
    return { ok: false, error: { code: 'invalid_output', reason: 'missing_tool_use' } }
  }
  const tools = input.content.filter(block => isRecord(block) && block.type === 'tool_use')
  if (tools.length === 0) return { ok: false, error: { code: 'invalid_output', reason: 'missing_tool_use' } }
  if (tools.length > 1) return { ok: false, error: { code: 'invalid_output', reason: 'ambiguous_tool_use' } }
  const tool = tools[0]
  if (tool.name !== expectedName) return { ok: false, error: { code: 'invalid_output', reason: 'wrong_tool_name' } }
  if (!('input' in tool)) return { ok: false, error: { code: 'invalid_output', reason: 'invalid_tool_input' } }
  return { ok: true, value: { type: 'tool_use', name: expectedName, input: tool.input } }
}

export function unwrapLegacyToolInput(input: unknown): AiStructuredParsingResult<unknown> {
  if (!isRecord(input) || Object.keys(input).length !== 1 || !('input' in input)) return { ok: true, value: input }
  const unwrapped = input.input
  if (isRecord(unwrapped) && 'input' in unwrapped) {
    return { ok: false, error: { code: 'invalid_output', reason: 'excessive_tool_input_wrapping' } }
  }
  return { ok: true, value: unwrapped }
}
