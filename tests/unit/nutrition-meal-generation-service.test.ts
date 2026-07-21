import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { createAiCancellationController } from '@/lib/ai/provider'
import type { AiJsonRequest, AiProvider, AiResult } from '@/lib/ai/provider'
import { buildMealGenerationSystemPrompt, generateMealPlan } from '@/lib/nutrition/meal-generation'
import type { MealGenerationParams } from '@/lib/nutrition/meal-generation'

const params: MealGenerationParams = {
  calorie_goal: 2_000, protein_goal: 140, carbs_goal: 220, fat_goal: 60,
  dietary_type: 'sans_gluten', allergies: ['arachides'], disliked_foods: ['céleri'],
  meal_food_names: { morning: ['avoine'] },
}

function validLegacyDay(protein = 'Riz') {
  const food = { aliment: protein, quantite_g: 100, kcal: 130, proteines: 3, glucides: 28, lipides: 1 }
  return { repas: { petit_dejeuner: [food], dejeuner: [food], collation: [food], diner: [food] } }
}

function success(value = validLegacyDay(), inputTokens?: number, outputTokens?: number): AiResult<ReturnType<typeof validLegacyDay>> {
  return {
    ok: true, output: 'json', value,
    metadata: {
      correlationId: 'meal-plan-1', requestedModel: 'claude-opus-4-8', actualModel: 'claude-opus-4-8', stopReason: 'end_turn',
      ...(inputTokens === undefined && outputTokens === undefined ? {} : { usage: { inputTokens, outputTokens } }),
    },
  }
}

function providerWith(results: Array<AiResult<ReturnType<typeof validLegacyDay>>>) {
  const generate = vi.fn(async (request: unknown, context: unknown) => {
    void request
    void context
    return results.shift() ?? success()
  })
  return { provider: { generate } as unknown as AiProvider, generate }
}

describe('meal generation service through AiProvider', () => {
  it('builds the preserved prompt with preferences and no credential material', () => {
    const prompt = buildMealGenerationSystemPrompt(params)
    expect(prompt).toContain('2000 KCAL/JOUR')
    expect(prompt).toContain('sans_gluten')
    expect(prompt).not.toMatch(/x-api-key|ANTHROPIC_API_KEY|Bearer /)
  })

  it('generates seven ordered days with exact requests, cumulative context and complete usage', async () => {
    const { provider, generate } = providerWith(Array.from({ length: 7 }, () => success(validLegacyDay('Poulet'), 10, 5)))
    const progress: unknown[] = []
    const result = await generateMealPlan(params, { provider, correlationId: 'meal-plan-1' }, event => progress.push(event))
    expect(Object.keys(result.plan)).toEqual(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'])
    expect(progress).toEqual(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((day, index) => ({ type: 'progress', day, index: index + 1, total: 7 })))
    expect(generate).toHaveBeenCalledTimes(7)
    const first = generate.mock.calls[0]?.[0] as AiJsonRequest<unknown>
    const second = generate.mock.calls[1]?.[0] as AiJsonRequest<unknown>
    expect(first).toMatchObject({ output: 'json', model: 'claude-opus-4-8', maxTokens: 1500 })
    expect(first.temperature).toBeUndefined()
    expect(first.messages[0]?.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('Génère le plan pour LUNDI.') })
    expect(second.messages[0]?.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('Protéines déjà utilisées les jours précédents (VARIE !) : Poulet, Poulet') })
    expect(generate.mock.calls.every(call => (call[1] as { correlationId?: string } | undefined)?.correlationId === 'meal-plan-1')).toBe(true)
    expect(result).toMatchObject({ partial: false, failedDays: 0, usage: { attemptCount: 7, providerModel: 'claude-opus-4-8', tokens: { inputTokens: 70, outputTokens: 35 }, tokenCompleteness: 'complete' } })
  })

  it('keeps a legitimate empty day distinct from invalid provider output', async () => {
    const empty = { repas: { petit_dejeuner: [], dejeuner: [], collation: [], diner: [] } }
    const { provider } = providerWith([success(empty), ...Array.from({ length: 6 }, () => ({ ok: false as const, error: { code: 'invalid_output' as const, retryable: false }, metadata: { correlationId: 'meal-plan-1', requestedModel: 'claude-opus-4-8' } }))])
    const result = await generateMealPlan(params, { provider, correlationId: 'meal-plan-1' })
    expect(result.plan.lundi.meals).toHaveLength(4)
    expect(result.plan.mardi).toEqual({ meals: [], totals: { kcal: 0, prot: 0, carb: 0, fat: 0 } })
    expect(result).toMatchObject({ partial: true, failedDays: 6 })
  })

  it('isolates first and middle provider failures and still performs at most seven calls', async () => {
    const failure = { ok: false as const, error: { code: 'network_error' as const, retryable: true }, metadata: { correlationId: 'meal-plan-1', requestedModel: 'claude-opus-4-8' } }
    const { provider, generate } = providerWith([failure, success(), success(), failure])
    const result = await generateMealPlan(params, { provider, correlationId: 'meal-plan-1' })
    expect(generate).toHaveBeenCalledTimes(7)
    expect(result).toMatchObject({ partial: true, failedDays: 2, usage: { attemptCount: 7 } })
  })

  it('aggregates partial and unavailable token metadata without inventing zero', async () => {
    const partialProvider = providerWith([success(validLegacyDay(), 10, 5), ...Array.from({ length: 6 }, () => success())]).provider
    await expect(generateMealPlan(params, { provider: partialProvider, correlationId: 'meal-plan-1' })).resolves.toMatchObject({ usage: { tokens: { inputTokens: 10, outputTokens: 5 }, tokenCompleteness: 'partial' } })
    const unavailableProvider = providerWith(Array.from({ length: 7 }, () => success())).provider
    const unavailable = await generateMealPlan(params, { provider: unavailableProvider, correlationId: 'meal-plan-1' })
    expect(unavailable.usage).toEqual({ attemptCount: 7, providerModel: 'claude-opus-4-8', tokenCompleteness: 'unavailable' })
  })

  it('stops after cancellation and performs no later calls', async () => {
    const cancellation = createAiCancellationController()
    let calls = 0
    const provider = { generate: vi.fn(async () => {
      calls += 1
      if (calls === 1) return success(validLegacyDay(), 10, 5)
      cancellation.abort()
      return { ok: false as const, error: { code: 'cancelled' as const, retryable: false }, metadata: { correlationId: 'meal-plan-1', requestedModel: 'claude-opus-4-8' } }
    }) } as unknown as AiProvider
    await expect(generateMealPlan(params, { provider, correlationId: 'meal-plan-1', cancellation: cancellation.signal })).rejects.toMatchObject({ code: 'cancelled', usage: { attemptCount: 2 } })
    expect(calls).toBe(2)
  })

  it('does not call the provider when already cancelled', async () => {
    const cancellation = createAiCancellationController()
    cancellation.abort()
    const { provider, generate } = providerWith([])
    await expect(generateMealPlan(params, { provider, correlationId: 'meal-plan-1', cancellation: cancellation.signal })).rejects.toMatchObject({ code: 'cancelled', usage: { attemptCount: 0 } })
    expect(generate).not.toHaveBeenCalled()
  })
})
