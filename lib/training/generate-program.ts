/**
 * Core program generation logic — pure function, no auth/request dependency.
 * Used by the API endpoint (generate-custom-program) and the cron (F6.B.6).
 */
import { findExerciseMatch } from '../exercise-matching'
import { buildTrainingProgramInvocation } from '../ai/prompts'
import { resolveAiModel } from '../ai/models'
import type { AiCancellationSignal, AiErrorCode, AiProvider } from '../ai/provider'
import { promptInvocationToToolRequest } from '../ai/providers/anthropic'
import { createAiOutputValidator, modernTrainingProgramOutputSchema } from '../ai/schemas'
import type { ModernTrainingProgramOutput } from '../ai/schemas'
import type { AiRecordedTokens } from '../ai/usage/types'

export interface GenerateProgramInput {
  objective: string
  level: string
  daysPerWeek: number
  duration: number
  equipment: string
  priorities: string[]
  notes: string
  gender: string
}

export interface GenerateProgramRuntime {
  provider: AiProvider
  correlationId: string
  cancellation?: AiCancellationSignal
}

export function trainingProgramGenerationMessage(code: AiErrorCode | 'model_unavailable'): string {
  if (code === 'invalid_output') return 'Format IA invalide'
  if (code === 'model_unavailable') return 'Modèle IA indisponible'
  return `Génération IA impossible (${code})`
}

export class TrainingProgramGenerationError extends Error {
  constructor(readonly code: AiErrorCode | 'model_unavailable') {
    super(trainingProgramGenerationMessage(code))
    this.name = 'TrainingProgramGenerationError'
  }
}

// ─── Program structures by days × gender ───

/**
 * Generate a training program via Anthropic tool_use.
 * Used by the API endpoint and the cron with the same prompt contract.
 */
export async function generateProgram(
  input: GenerateProgramInput,
  runtime: GenerateProgramRuntime,
  catalog: { id: string; name: string }[] = [],
  onProviderMetadata?: (metadata: { providerModel?: string; tokens?: AiRecordedTokens }) => void,
): Promise<ModernTrainingProgramOutput> {
  const invocation = buildTrainingProgramInvocation(input, catalog)
  const model = resolveAiModel('anthropic-opus-4.8')
  if (!model.ok || model.model.status !== 'active') throw new TrainingProgramGenerationError('model_unavailable')
  const generated = await runtime.provider.generate(
    promptInvocationToToolRequest(invocation, model.model.providerModelId, createAiOutputValidator(modernTrainingProgramOutputSchema)),
    { correlationId: runtime.correlationId, timeoutMs: 300_000, cancellation: runtime.cancellation },
  )
  if (!generated.ok) throw new TrainingProgramGenerationError(generated.error.code)
  onProviderMetadata?.({ providerModel: generated.metadata.actualModel, tokens: generated.metadata.usage })
  if (catalog.length === 0) return generated.value

  // Post-process immutably: resolve exercise names against catalog + set exercise_id
  return {
    ...generated.value,
    days: generated.value.days.map(day => ({
      ...day,
      exercises: day.exercises.map(exercise => {
        const match = findExerciseMatch(catalog, exercise.custom_name)
        return {
          ...exercise,
          custom_name: match?.name ?? exercise.custom_name,
          exercise_id: match?.id ?? null,
        }
      }),
    })),
  }
}
