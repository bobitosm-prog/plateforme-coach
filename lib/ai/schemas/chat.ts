import { z } from 'zod'

export const aiFreeTextSchema = z.string().trim().min(1).max(100_000)

const anthropicTextBlockSchema = z.object({
  type: z.literal('text'),
  text: aiFreeTextSchema,
}).strict()

const anthropicUsageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cache_read_input_tokens: z.number().int().nonnegative().optional(),
  cache_creation_input_tokens: z.number().int().nonnegative().optional(),
}).strict()

export const athenaResponseSchema = z.object({
  id: z.string().min(1).max(256).optional(),
  model: z.string().min(1).max(256).optional(),
  content: z.array(anthropicTextBlockSchema).min(1).max(64),
  stop_reason: z.enum(['end_turn', 'max_tokens', 'tool_use', 'refusal']).nullable().optional(),
  usage: anthropicUsageSchema.optional(),
}).strict()

export type AiFreeText = z.infer<typeof aiFreeTextSchema>
export type AthenaResponse = z.infer<typeof athenaResponseSchema>
