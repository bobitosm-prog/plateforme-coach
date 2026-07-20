/**
 * Core program generation logic — pure function, no auth/request dependency.
 * Used by the API endpoint (generate-custom-program) and the cron (F6.B.6).
 */
import { unwrapToolInput } from '../anthropic/unwrap-tool-input'
import { findExerciseMatch } from '../exercise-matching'
import { buildTrainingProgramInvocation } from '../ai/prompts'

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
export async function generateProgram(input: GenerateProgramInput, apiKey: string, catalog: { id: string; name: string }[] = []): Promise<any> {
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
    const err = await res.text()
    console.error('[generateProgram] Anthropic error:', res.status, err.slice(0, 200))
    throw new Error(`Anthropic ${res.status}`)
  }

  const json = await res.json()
  const toolUseBlock = json.content?.find((c: any) => c.type === 'tool_use')
  if (!toolUseBlock) {
    console.error('[generateProgram] No tool_use in response:', JSON.stringify(json).slice(0, 500))
    throw new Error('Format IA invalide')
  }

  const program = unwrapToolInput(toolUseBlock.input)

  // Post-process: resolve exercise names against catalog + set exercise_id
  if (catalog.length > 0 && program?.days) {
    for (const day of program.days) {
      for (const ex of (day.exercises || [])) {
        const match = findExerciseMatch(catalog, ex.custom_name)
        if (match) {
          ex.custom_name = match.name
          ex.exercise_id = match.id
        } else {
          ex.exercise_id = null
        }
      }
    }
  }

  return program
}
