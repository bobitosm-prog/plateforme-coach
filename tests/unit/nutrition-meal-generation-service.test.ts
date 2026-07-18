import { describe, expect, it, vi } from 'vitest'

import { buildMealGenerationSystemPrompt, createAnthropicMealGenerationProvider, generateMealPlan } from '@/lib/nutrition/meal-generation'
import type { MealGenerationParams, MealGenerationProvider } from '@/lib/nutrition/meal-generation'
import { anthropicMock } from '../mocks/anthropic'

const params: MealGenerationParams = {
  calorie_goal: 2_000, protein_goal: 140, carbs_goal: 220, fat_goal: 60,
  dietary_type: 'sans_gluten', allergies: ['arachides'], disliked_foods: ['céleri'],
  meal_food_names: { morning: ['avoine'] },
}

function validLegacyDay() {
  const food = { aliment: 'Riz', quantite_g: 100, kcal: 130, proteines: 3, glucides: 28, lipides: 1 }
  return JSON.stringify({ repas: { petit_dejeuner: [food], dejeuner: [food], collation: [food], diner: [food] } })
}

function providerWith(text: string): MealGenerationProvider {
  return { generate: vi.fn().mockResolvedValue({ ok: true, text }) }
}

describe('meal generation service', () => {
  it('builds the preserved prompt with preferences and no credential material', () => {
    const prompt = buildMealGenerationSystemPrompt(params)
    expect(prompt).toContain('2000 KCAL/JOUR')
    expect(prompt).toContain('sans_gluten')
    expect(prompt).not.toMatch(/x-api-key|ANTHROPIC_API_KEY|Bearer /)
  })

  it('generates seven deterministic SSE-compatible days and progress events', async () => {
    const provider = providerWith(validLegacyDay())
    const progress: unknown[] = []
    const result = await generateMealPlan(params, provider, (event) => progress.push(event))
    expect(result.partial).toBe(false)
    expect(Object.keys(result.plan)).toEqual(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'])
    expect(progress).toHaveLength(7)
    expect(provider.generate).toHaveBeenCalledTimes(7)
    expect(result.plan.lundi.meals[0].foods[0]).toMatchObject({ name: 'Riz', qty: 100 })
  })

  it.each([
    ['malformed JSON', 'not-json'],
    ['invalid structure', JSON.stringify({ repas: { petit_dejeuner: [] } })],
    ['negative macros', JSON.stringify({ repas: { petit_dejeuner: [{ aliment: 'X', quantite_g: 1, kcal: -1, proteines: 0, glucides: 0, lipides: 0 }], dejeuner: [], collation: [], diner: [] } })],
  ])('fails closed per day for %s while preserving the partial seven-day contract', async (_label, text) => {
    const result = await generateMealPlan(params, providerWith(text))
    expect(result).toMatchObject({ ok: true, partial: true, failedDays: 7 })
    expect(result.plan.lundi).toEqual({ meals: [], totals: { kcal: 0, prot: 0, carb: 0, fat: 0 } })
  })

  it('maps provider failures without exposing provider bodies', async () => {
    for (let index = 0; index < 4; index += 1) anthropicMock.fail(index === 0 ? 429 : 500)
    const provider = createAnthropicMealGenerationProvider({ apiKey: 'local-test-key', fetchImpl: anthropicMock.fetch })
    await expect(provider.generate({ model: 'claude-opus-4-8', maxTokens: 1500, system: 'safe', user: 'safe' })).resolves.toEqual({ ok: false, reason: 'PROVIDER_RATE_LIMITED' })
    await expect(provider.generate({ model: 'claude-opus-4-8', maxTokens: 1500, system: 'safe', user: 'safe' })).resolves.toEqual({ ok: false, reason: 'PROVIDER_UNAVAILABLE' })
  })

  it('maps timeout, transport failure and invalid provider payloads to bounded reasons', async () => {
    const timeout = createAnthropicMealGenerationProvider({ apiKey: 'x', fetchImpl: vi.fn().mockRejectedValue(new DOMException('secret', 'AbortError')) })
    const failed = createAnthropicMealGenerationProvider({ apiKey: 'x', fetchImpl: vi.fn().mockRejectedValue(new Error('secret provider body')) })
    const invalid = createAnthropicMealGenerationProvider({ apiKey: 'x', fetchImpl: vi.fn().mockResolvedValue(Response.json({ content: [] })) })
    const request = { model: 'claude-opus-4-8' as const, maxTokens: 1500 as const, system: 'safe', user: 'safe' }
    await expect(timeout.generate(request)).resolves.toEqual({ ok: false, reason: 'PROVIDER_TIMEOUT' })
    await expect(failed.generate(request)).resolves.toEqual({ ok: false, reason: 'PROVIDER_UNAVAILABLE' })
    await expect(invalid.generate(request)).resolves.toEqual({ ok: false, reason: 'PROVIDER_INVALID_RESPONSE' })
  })
})
