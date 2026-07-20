import { describe, expect, it } from 'vitest'

import {
  adaptedWorkoutOutputSchema,
  aiFreeTextSchema,
  athenaResponseSchema,
  bodyAnalysisOutputSchema,
  createAiOutputValidator,
  createToolUseEnvelopeSchema,
  exerciseInstructionsOutputSchema,
  exerciseSuggestionsOutputSchema,
  legacyTrainingProgramOutputSchema,
  mealPhotoOutputSchema,
  modernTrainingProgramOutputSchema,
  nutritionDayOutputSchema,
  overloadSuggestionOutputSchema,
  progressPhotoOutputSchema,
  recipeOutputSchema,
  unwrapToolUseInput,
  validateAiOutput,
  weeklyDiagnosticOutputSchema,
} from '@/lib/ai/schemas'
import { validateStructuredOutput } from '@/lib/ai/provider'
import { validDiagnosticOutput, validModernProgramOutput, validRecipeOutput } from '../fixtures/ai-output-schemas'

describe('AI output schemas', () => {
  it('validates Athena text and bounded provider metadata', () => {
    expect(athenaResponseSchema.safeParse({
      id: 'msg_1', model: 'claude-haiku', content: [{ type: 'text', text: 'Bonjour' }],
      stop_reason: 'end_turn', usage: { input_tokens: 3, output_tokens: 2 },
    }).success).toBe(true)
    expect(aiFreeTextSchema.safeParse('   ').success).toBe(false)
  })

  it('validates the three observed Nutrition outputs', () => {
    expect(recipeOutputSchema.parse(validRecipeOutput).title).toBe('Poulet riz')
    expect(nutritionDayOutputSchema.safeParse({
      breakfast: [], snack: [], lunch: [{ aliment: 'Riz', quantite_g: 100, calories: 130, proteines: 3, glucides: 28, lipides: 0 }], dinner: [],
      total_calories: 130,
    }).success).toBe(true)
    expect(mealPhotoOutputSchema.safeParse({
      foods: [{ name: 'Riz', quantity_g: 100, calories: 130, proteins: 3, carbs: 28, fats: 0 }], total_calories: 130, confidence: 'medium',
    }).success).toBe(true)
  })

  it('rejects unknown keys, negative nutrients, NaN and truncated JSON text', () => {
    expect(recipeOutputSchema.safeParse({ ...validRecipeOutput, secret: 'raw' }).success).toBe(false)
    expect(recipeOutputSchema.safeParse({ ...validRecipeOutput, calories_per_serving: -1 }).success).toBe(false)
    expect(recipeOutputSchema.safeParse({ ...validRecipeOutput, calories_per_serving: Number.NaN }).success).toBe(false)
    expect(recipeOutputSchema.safeParse('{"title":').success).toBe(false)
  })

  it('validates the observed Training JSON contracts', () => {
    expect(exerciseSuggestionsOutputSchema.safeParse([{ name: 'Presse', muscles: 'Quadriceps', reason: 'Même chaîne', difficulty: 'intermediaire' }]).success).toBe(true)
    expect(exerciseInstructionsOutputSchema.safeParse({ instructions: 'Position stable.', tips: 'Respirer.' }).success).toBe(true)
    expect(adaptedWorkoutOutputSchema.safeParse([{ name: 'Squat', sets: 3, reps: '8-10', rest_seconds: 90, priority: 'haute', kept: true }]).success).toBe(true)
    expect(overloadSuggestionOutputSchema.safeParse({ weight: 82.5, reps: 8, reasoning: 'Progression prudente' }).success).toBe(true)
    expect(legacyTrainingProgramOutputSchema.safeParse({ lundi: { isRest: false, day_name: 'Push', exercises: [{ name: 'Développé', sets: 4, reps: 8, rest_seconds: 90 }] } }).success).toBe(true)
    expect(modernTrainingProgramOutputSchema.parse(validModernProgramOutput).days).toHaveLength(1)
  })

  it('validates tool-based progression and diagnostic outputs', () => {
    const body = { body_fat_estimate: 18, lean_mass_estimate: 62, strengths: ['Posture', 'Dos'], improvements: ['Jambes', 'Symétrie'], symmetry_score: 78, summary: 'Analyse visuelle.' }
    expect(bodyAnalysisOutputSchema.safeParse(body).success).toBe(true)
    expect(progressPhotoOutputSchema.safeParse({ kind: 'comparison', text: '**Évolution** visible.' }).success).toBe(true)
    expect(weeklyDiagnosticOutputSchema.safeParse(validDiagnosticOutput).success).toBe(true)

    const envelopeSchema = createToolUseEnvelopeSchema('body_analysis_output', bodyAnalysisOutputSchema)
    const parsed = envelopeSchema.parse({ type: 'tool_use', name: 'body_analysis_output', input: { input: body } })
    expect(unwrapToolUseInput(parsed.input)).toEqual(body)
    expect(envelopeSchema.safeParse({ type: 'tool_use', name: 'wrong_tool', input: body }).success).toBe(false)
  })

  it('returns deterministic sanitized validation failures', () => {
    const input = { ...validDiagnosticOutput, score_semaine: 101, privatePrompt: 'do not expose' }
    const first = validateAiOutput(weeklyDiagnosticOutputSchema, input)
    const second = validateAiOutput(weeklyDiagnosticOutputSchema, input)
    expect(first).toEqual(second)
    expect(first).toEqual({ ok: false, error: { code: 'invalid_output', issueCount: 2, fields: ['score_semaine', '$'] } })
    expect(JSON.stringify(first)).not.toContain('do not expose')
  })

  it('adapts Zod schemas to the common provider validator without throwing', () => {
    const validator = createAiOutputValidator(recipeOutputSchema)
    expect(validateStructuredOutput(validRecipeOutput, validator).ok).toBe(true)
    expect(validateStructuredOutput({ title: 'incomplete' }, validator)).toEqual({ ok: false })
  })

  it('does not mutate structured inputs', () => {
    const mutable = structuredClone(validModernProgramOutput)
    const before = structuredClone(mutable)
    const parsed = modernTrainingProgramOutputSchema.parse(mutable)
    expect(mutable).toEqual(before)
    expect(parsed).not.toBe(mutable)
  })
})
