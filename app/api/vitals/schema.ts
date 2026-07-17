import { z } from 'zod'

export const webVitalSchema = z.object({
  name: z.string().min(1).max(32),
  value: z.number().finite(),
  id: z.string().max(128).optional(),
  path: z.string().max(500).optional(),
}).passthrough()

export type WebVitalInput = z.infer<typeof webVitalSchema>
