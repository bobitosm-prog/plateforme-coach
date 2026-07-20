import { z } from 'zod'

import { aiFreeTextSchema } from './chat'

export const bodyAnalysisOutputSchema = z.object({
  body_fat_estimate: z.number().finite().min(0).max(100),
  lean_mass_estimate: z.number().finite().nonnegative(),
  strengths: z.array(z.string().trim().min(1).max(2_000)).min(1).max(20),
  improvements: z.array(z.string().trim().min(1).max(2_000)).min(1).max(20),
  symmetry_score: z.number().finite().min(0).max(100),
  summary: z.string().trim().min(1).max(10_000),
}).strict()

export const progressPhotoOutputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('assessment'), text: aiFreeTextSchema }).strict(),
  z.object({ kind: z.literal('single'), text: aiFreeTextSchema }).strict(),
  z.object({ kind: z.literal('comparison'), text: aiFreeTextSchema }).strict(),
])

export type BodyAnalysisOutput = z.infer<typeof bodyAnalysisOutputSchema>
export type ProgressPhotoOutput = z.infer<typeof progressPhotoOutputSchema>
