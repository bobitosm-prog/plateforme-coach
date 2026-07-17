import { z } from 'zod'

export const updateLocaleSchema = z.object({
  locale: z.enum(['fr', 'en', 'de']),
}).passthrough()

export type UpdateLocaleInput = z.infer<typeof updateLocaleSchema>
