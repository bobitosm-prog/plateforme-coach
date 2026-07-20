import type { z } from 'zod'

import { validateAiOutput } from '@/lib/ai/schemas'

import { parseAiJson } from './json'
import { parseAiToolUse, unwrapLegacyToolInput } from './tool'
import type { AiJsonParsingOptions, AiStructuredParsingResult } from './types'

export function normalizeAiStructuredOutput<T>(schema: z.ZodType<T>, input: unknown): AiStructuredParsingResult<T> {
  const result = validateAiOutput(schema, input)
  return result.ok
    ? result
    : { ok: false, error: { code: 'invalid_output', reason: 'invalid_shape', issueCount: result.error.issueCount, fields: result.error.fields } }
}

export function parseAndValidateAiOutput<T>(input: string, schema: z.ZodType<T>, options: AiJsonParsingOptions = {}): AiStructuredParsingResult<T> {
  const decoded = parseAiJson(input, options)
  return decoded.ok ? normalizeAiStructuredOutput(schema, decoded.value) : decoded
}

export function parseAndValidateToolUse<T>(input: unknown, expectedName: string, schema: z.ZodType<T>): AiStructuredParsingResult<T> {
  const tool = parseAiToolUse(input, expectedName)
  if (!tool.ok) return tool
  const unwrapped = unwrapLegacyToolInput(tool.value.input)
  return unwrapped.ok ? normalizeAiStructuredOutput(schema, unwrapped.value) : unwrapped
}
