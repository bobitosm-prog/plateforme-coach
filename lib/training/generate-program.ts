/**
 * Core program generation logic — pure function, no auth/request dependency.
 * Used by the API endpoint (generate-custom-program) and the cron (F6.B.6).
 */
import { findExerciseMatch } from '../exercise-matching'
import { buildTrainingProgramInvocation } from '../ai/prompts'
import { parseAndValidateToolUse } from '../ai/parsing'
import { modernTrainingProgramOutputSchema } from '../ai/schemas'
import { readAnthropicMetadata } from '../ai/usage/provider-metadata'
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

// ─── Program structures by days × gender ───

/**
 * Generate a training program via Anthropic tool_use.
 * Used by the API endpoint and the cron with the same prompt contract.
 */
export async function generateProgram(
  input: GenerateProgramInput,
  apiKey: string,
  catalog: { id: string; name: string }[] = [],
  onProviderMetadata?: (metadata: { providerModel?: string; tokens?: AiRecordedTokens }) => void,
): Promise<any> {
  const invocation = buildTrainingProgramInvocation(input, catalog)
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(invocation),
  })

  if (!res.ok) {
    console.error('[generateProgram] Anthropic error:', res.status)
    throw new Error(`Anthropic ${res.status}`)
  }

  const json = await res.json()
  onProviderMetadata?.(readAnthropicMetadata(json))
  const parsed = parseAndValidateToolUse(json, 'generate_program', modernTrainingProgramOutputSchema)
  if (!parsed.ok) {
    console.error('[generateProgram] Invalid structured response')
    throw new Error('Format IA invalide')
  }
  if (catalog.length === 0) return parsed.value

  // Post-process immutably: resolve exercise names against catalog + set exercise_id
  return {
    ...parsed.value,
    days: parsed.value.days.map(day => ({
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
