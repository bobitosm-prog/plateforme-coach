import type { AiPromptInvocation } from '../../../lib/ai/prompts'

export type AiGoldenId =
  | 'chat-athena' | 'generate-recipe' | 'generate-meal-plan' | 'analyze-meal-photo'
  | 'suggest-exercise' | 'generate-exercise-instructions' | 'generate-program-legacy'
  | 'generate-program-modern' | 'training-regen-cron' | 'adapt-workout' | 'suggest-overload'
  | 'analyze-body' | 'analyze-progress-photo' | 'weekly-diagnostic-manual' | 'weekly-diagnostic-cron'

export type AiOutputKind = 'text' | 'json' | 'tool' | 'sse'
export type AiSurface = 'http' | 'sse' | 'cron'

export interface AiGoldenContract {
  readonly id: AiGoldenId
  readonly entryPoint: string
  readonly domain: 'chat' | 'nutrition' | 'training' | 'progression' | 'diagnostic'
  readonly surface: AiSurface
  readonly logicalModel: string
  readonly providerModel: string
  readonly quotaPolicy: string
  readonly outputKind: AiOutputKind
  readonly invocation: () => AiPromptInvocation | Readonly<{ maxTokens: number; system: string; user: string }>
  readonly expectedInvocationSha256: string
  readonly publicCases: Readonly<{
    success: unknown
    failure: unknown
    partial?: unknown
    legacy?: unknown
    invalid: unknown
  }>
}
