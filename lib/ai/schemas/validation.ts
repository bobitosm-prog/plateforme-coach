import { z } from 'zod'

import type { AiOutputValidator } from '@/lib/ai/provider'

const MAX_REPORTED_PATHS = 8

export type AiSchemaValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: 'invalid_output'; issueCount: number; fields: readonly string[] } }

function formatPath(path: PropertyKey[]): string {
  return path.map(String).join('.').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 160) || '$'
}

export function validateAiOutput<T>(schema: z.ZodType<T>, input: unknown): AiSchemaValidationResult<T> {
  const result = schema.safeParse(input)
  if (result.success) return { ok: true, value: result.data }

  return {
    ok: false,
    error: {
      code: 'invalid_output',
      issueCount: result.error.issues.length,
      fields: [...new Set(result.error.issues.map(issue => formatPath(issue.path)))].slice(0, MAX_REPORTED_PATHS),
    },
  }
}

export function createAiOutputValidator<T>(schema: z.ZodType<T>): AiOutputValidator<T> {
  return input => {
    const result = validateAiOutput(schema, input)
    return result.ok ? { ok: true, value: result.value } : { ok: false }
  }
}

export function createToolUseEnvelopeSchema<Name extends string, Output>(name: Name, output: z.ZodType<Output>) {
  return z.object({
    type: z.literal('tool_use'),
    id: z.string().min(1).max(256).optional(),
    name: z.literal(name),
    input: z.union([output, z.object({ input: output }).strict()]),
  }).strict()
}

export function unwrapToolUseInput<T>(input: T | { input: T }): T {
  return typeof input === 'object' && input !== null && 'input' in input ? input.input : input
}
