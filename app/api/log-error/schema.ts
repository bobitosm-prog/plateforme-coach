import { z } from 'zod'

export const clientLogSchema = z.object({
  level: z.unknown().optional(),
  message: z.unknown().refine(Boolean),
  page_url: z.unknown().optional(),
  details: z.unknown().optional(),
}).passthrough()

export type ClientLogInput = z.infer<typeof clientLogSchema>
