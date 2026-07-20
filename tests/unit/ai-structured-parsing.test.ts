import { describe, expect, it } from 'vitest'

import { parseAiJson, parseAiToolUse, parseAndValidateAiOutput, parseAndValidateToolUse } from '@/lib/ai/parsing'
import { bodyAnalysisOutputSchema, recipeOutputSchema } from '@/lib/ai/schemas'
import { validRecipeOutput } from '../fixtures/ai-output-schemas'

const body = { body_fat_estimate: 18, lean_mass_estimate: 62, strengths: ['Dos', 'Posture'], improvements: ['Jambes', 'Symétrie'], symmetry_score: 78, summary: 'Analyse.' }

describe('AI structured parsing', () => {
  it('accepts exact JSON and an explicitly permitted complete fence', () => {
    expect(parseAndValidateAiOutput(JSON.stringify(validRecipeOutput), recipeOutputSchema).ok).toBe(true)
    expect(parseAndValidateAiOutput(`\`\`\`json\n${JSON.stringify(validRecipeOutput)}\n\`\`\``, recipeOutputSchema, { allowMarkdownFence: true }).ok).toBe(true)
  })

  it('refuses fences by default and surrounding text unless legacy mode is explicit', () => {
    const fenced = `\`\`\`json\n${JSON.stringify(validRecipeOutput)}\n\`\`\``
    expect(parseAiJson(fenced)).toEqual({ ok: false, error: { code: 'invalid_output', reason: 'markdown_fence_not_allowed' } })
    const surrounded = `Réponse: ${JSON.stringify(validRecipeOutput)} terminé`
    expect(parseAiJson(surrounded).ok).toBe(false)
    expect(parseAndValidateAiOutput(surrounded, recipeOutputSchema, { allowLegacySurroundingText: true }).ok).toBe(true)
  })

  it('uses balanced extraction rather than a greedy regular expression', () => {
    const input = `avant {"title":"accolade } dans texte","value":[1,{"x":2}]} après {"ignored":true}`
    expect(parseAiJson(input, { allowLegacySurroundingText: true })).toEqual({ ok: true, value: { title: 'accolade } dans texte', value: [1, { x: 2 }] } })
  })

  it('refuses truncated, oversized and double encoded JSON', () => {
    expect(parseAiJson('{"a":')).toEqual({ ok: false, error: { code: 'invalid_output', reason: 'invalid_json' } })
    expect(parseAiJson('{"value":NaN}')).toEqual({ ok: false, error: { code: 'invalid_output', reason: 'invalid_json' } })
    expect(parseAiJson('{"a":1}', { maxCharacters: 3 })).toEqual({ ok: false, error: { code: 'invalid_output', reason: 'input_too_large' } })
    expect(parseAndValidateAiOutput(JSON.stringify(JSON.stringify(validRecipeOutput)), recipeOutputSchema).ok).toBe(false)
  })

  it('extracts exactly one correctly named tool and validates its input', () => {
    const response = { content: [{ type: 'text', text: 'ignored' }, { type: 'tool_use', name: 'body_analysis_output', input: body }] }
    expect(parseAndValidateToolUse(response, 'body_analysis_output', bodyAnalysisOutputSchema)).toEqual({ ok: true, value: body })
    expect(parseAiToolUse(response, 'wrong')).toEqual({ ok: false, error: { code: 'invalid_output', reason: 'wrong_tool_name' } })
  })

  it('refuses absent and ambiguous tools', () => {
    expect(parseAiToolUse({ content: [] }, 'tool')).toEqual({ ok: false, error: { code: 'invalid_output', reason: 'missing_tool_use' } })
    expect(parseAiToolUse({ content: [{ type: 'tool_use', name: 'tool', input: {} }, { type: 'tool_use', name: 'tool', input: {} }] }, 'tool')).toEqual({ ok: false, error: { code: 'invalid_output', reason: 'ambiguous_tool_use' } })
  })

  it('accepts one legacy input wrapper but rejects excessive wrapping', () => {
    expect(parseAndValidateToolUse({ content: [{ type: 'tool_use', name: 'body', input: { input: body } }] }, 'body', bodyAnalysisOutputSchema).ok).toBe(true)
    expect(parseAndValidateToolUse({ content: [{ type: 'tool_use', name: 'body', input: { input: { input: body } } }] }, 'body', bodyAnalysisOutputSchema)).toEqual({ ok: false, error: { code: 'invalid_output', reason: 'excessive_tool_input_wrapping' } })
  })

  it('returns bounded sanitized schema failures without mutating input', () => {
    const input = { ...validRecipeOutput, calories_per_serving: -1, private: 'secret-content' }
    const before = structuredClone(input)
    const first = parseAndValidateAiOutput(JSON.stringify(input), recipeOutputSchema)
    expect(first).toEqual(parseAndValidateAiOutput(JSON.stringify(input), recipeOutputSchema))
    expect(input).toEqual(before)
    expect(JSON.stringify(first)).not.toContain('secret-content')
  })
})
