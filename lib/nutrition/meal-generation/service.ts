import { buildSequentialMealDayInvocation } from '@/lib/ai/prompts'
import { resolveAiModel } from '@/lib/ai/models'
import type { AiResultMetadata } from '@/lib/ai/provider'
import { createAiOutputValidator, legacyNutritionDayOutputSchema } from '@/lib/ai/schemas'
import { MEAL_KEY_TO_TYPE, type MealKey, type DayPlan } from '@/lib/meal-plan'

import type { MealGenerationParams, MealGenerationResult, MealGenerationRuntime, MealGenerationUsage } from './types'

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function extractProteins(dayPlan: LegacyDay): string[] {
  const proteins: string[] = []
  if (!dayPlan?.repas) return proteins
  for (const meal of ['dejeuner', 'diner'] as const) {
    const foods = dayPlan.repas[meal]
    if (!Array.isArray(foods) || foods.length === 0) continue
    const name = foods[0]?.aliment || ''
    if (name) proteins.push(name)
  }
  return proteins
}

/**
 * Convert legacy LLM day output (repas{} + French fields) to canonical DayPlan.
 * The LLM prompt stays in legacy format (reliable); conversion happens after.
 */
function convertLegacyDayToCanonical(legacyDay: LegacyDay): DayPlan {
  const repas = legacyDay?.repas ?? {}
  const meals = (Object.keys(MEAL_KEY_TO_TYPE) as MealKey[]).map(key => {
    const rawFoods = repas[key]
    return {
      type: MEAL_KEY_TO_TYPE[key],
      foods: rawFoods.map((f) => ({
        name: String(f?.aliment ?? '').trim(),
        qty:  Number(f?.quantite_g ?? 0) || 0,
        kcal: Number(f?.kcal ?? 0) || 0,
        prot: Number(f?.proteines ?? 0) || 0,
        carb: Number(f?.glucides ?? 0) || 0,
        fat:  Number(f?.lipides ?? 0) || 0,
      })),
    }
  })
  return {
    meals,
    totals: {
      kcal: Number(legacyDay?.total_kcal ?? 0) || 0,
      prot: Number(legacyDay?.total_protein ?? 0) || 0,
      carb: Number(legacyDay?.total_carbs ?? 0) || 0,
      fat:  Number(legacyDay?.total_fat ?? 0) || 0,
    },
  }
}

/**
 * Rebalance macros deterministically after AI generation.
 * Reduces excess protein by shrinking the most protein-dense foods,
 * then reinjects freed calories into the most carb-dense foods.
 * Works on a deep copy — returns the rebalanced COPY if it improves the plan,
 * otherwise returns the ORIGINAL intact (never a half-mutated state).
 */
function rebalanceMacros(day: LegacyDay, targets: { protein_goal: number; carbs_goal: number; fat_goal: number; calorie_goal: number }): LegacyDay {
  const { protein_goal, carbs_goal, fat_goal, calorie_goal } = targets
  if (!protein_goal || protein_goal <= 0 || !carbs_goal || carbs_goal <= 0) return day

  // Deep copy — all mutations happen on working, original stays pristine
  const original = day
  const working = structuredClone(day)

  // Collect all food items from the WORKING copy
  const allItems: LegacyFood[] = []
  for (const foods of Object.values(working.repas)) {
    if (!Array.isArray(foods)) continue
    for (const item of foods) allItems.push(item)
  }
  if (allItems.length === 0) return original

  // Calculate current totals
  const sumTotals = () => {
    let p = 0, g = 0, l = 0, k = 0
    for (const it of allItems) { p += it.proteines; g += it.glucides; l += it.lipides; k += it.kcal }
    return { p, g, l, k }
  }
  const before = sumTotals()
  const kcalBefore = before.k

  // Memorize entry-state gaps for do-no-harm checks
  const protGapBefore = Math.abs(before.p - protein_goal)
  const pOutBefore = before.p < protein_goal * 0.85 || before.p > protein_goal * 1.15
  const gOutBefore = before.g < carbs_goal * 0.85 || before.g > carbs_goal * 1.15
  const lOutBefore = before.l < (fat_goal || 70) * 0.85 || before.l > (fat_goal || 70) * 1.15

  // Step 1: reduce protein if > target × 1.10
  if (before.p > protein_goal * 1.10) {
    const excessP = before.p - protein_goal
    const sorted = [...allItems].sort((a, b) => (b.proteines || 0) - (a.proteines || 0))
    let remaining = excessP
    for (const item of sorted) {
      if (remaining <= 0) break
      if (!item.quantite_g || item.quantite_g <= 40) continue
      const pPerG = item.proteines / item.quantite_g
      if (pPerG <= 0) continue
      const gToRemove = Math.min(remaining / pPerG, item.quantite_g - 40)
      if (gToRemove < 5) continue
      const ratio = (item.quantite_g - gToRemove) / item.quantite_g
      item.quantite_g = Math.round((item.quantite_g - gToRemove) / 5) * 5
      item.proteines = Math.round(item.proteines * ratio)
      item.glucides = Math.round(item.glucides * ratio)
      item.lipides = Math.round(item.lipides * ratio)
      item.kcal = Math.round(item.kcal * ratio)
      remaining -= Math.round(gToRemove * pPerG)
    }
  }

  // Step 2: reinject freed kcal into carbs if carbs are low
  const afterReduce = sumTotals()
  const freedKcal = kcalBefore - afterReduce.k
  if (freedKcal > 10 && afterReduce.g < carbs_goal) {
    const carbSorted = [...allItems].sort((a, b) => (b.glucides || 0) - (a.glucides || 0))
    let kcalToAdd = freedKcal
    for (const item of carbSorted) {
      if (kcalToAdd < 10) break
      if (!item.quantite_g || item.quantite_g <= 0) continue
      const kcalPerG = item.kcal / item.quantite_g
      if (kcalPerG <= 0) continue
      const gToAdd = Math.min(kcalToAdd / kcalPerG, 80) // cap increase at 80g per item
      if (gToAdd < 5) continue
      const ratio = (item.quantite_g + gToAdd) / item.quantite_g
      item.quantite_g = Math.round((item.quantite_g + gToAdd) / 5) * 5
      item.proteines = Math.round(item.proteines * ratio)
      item.glucides = Math.round(item.glucides * ratio)
      item.lipides = Math.round(item.lipides * ratio)
      item.kcal = Math.round(item.kcal * ratio)
      kcalToAdd -= Math.round(gToAdd * kcalPerG)
      // Stop if carbs overshoot
      const checkG = allItems.reduce((s, i) => s + i.glucides, 0)
      if (checkG >= carbs_goal * 1.10) break
    }
  }

  // Safety checks on the working copy — revert to original if any fails
  const final = sumTotals()

  // (a) NaN / qty <= 0
  for (const item of allItems) {
    if (!Number.isFinite(item.quantite_g) || item.quantite_g <= 0 ||
        !Number.isFinite(item.kcal) || !Number.isFinite(item.proteines) ||
        !Number.isFinite(item.glucides) || !Number.isFinite(item.lipides)) {
      console.warn('[rebalanceMacros] Invalid value detected, reverting to original')
      return original
    }
  }

  // (b) kcal out of range
  if (Math.abs(final.k - calorie_goal) > 100) {
    console.warn(`[rebalanceMacros] Kcal out of range after rebalance (${final.k} vs ${calorie_goal}), reverting`)
    return original
  }

  // (c) do-no-harm: protein gap must not worsen
  if (Math.abs(final.p - protein_goal) > protGapBefore + 1) {
    console.warn(`[rebalanceMacros] Protein gap worsened (${Math.abs(final.p - protein_goal)} > ${protGapBefore}), reverting`)
    return original
  }

  // (d) do-no-harm: no macro pushed out of ±15% that wasn't already out
  const pOutAfter = final.p < protein_goal * 0.85 || final.p > protein_goal * 1.15
  const gOutAfter = final.g < carbs_goal * 0.85 || final.g > carbs_goal * 1.15
  const lOutAfter = final.l < (fat_goal || 70) * 0.85 || final.l > (fat_goal || 70) * 1.15
  if ((pOutAfter && !pOutBefore) || (gOutAfter && !gOutBefore) || (lOutAfter && !lOutBefore)) {
    console.warn('[rebalanceMacros] Macro pushed out of ±15% bounds, reverting')
    return original
  }

  return working
}

function verifyDayPlan(day: LegacyDay, params: MealGenerationParams): LegacyDay {
  const targetKcal = params.calorie_goal
  let totalKcal = 0, totalP = 0, totalG = 0, totalL = 0
  for (const foods of Object.values(day.repas)) {
    if (!Array.isArray(foods)) continue
    for (const item of foods) {
      // Round all AI-generated values to integers
      item.quantite_g = Math.round(item.quantite_g || 0)
      item.kcal = Math.round(item.kcal || 0)
      item.proteines = Math.round(item.proteines || 0)
      item.glucides = Math.round(item.glucides || 0)
      item.lipides = Math.round(item.lipides || 0)
      totalKcal += item.kcal
      totalP += item.proteines
      totalG += item.glucides
      totalL += item.lipides
    }
  }
  if (Math.abs(totalKcal - targetKcal) > 150) {
    console.warn(`[meal-plan] Day off target: ${totalKcal} vs ${targetKcal} (diff: ${totalKcal - targetKcal})`)
  }

  // Rebalance macros if targets available (captures return — may be original or rebalanced copy)
  if (params.protein_goal) {
    day = rebalanceMacros(day, {
      protein_goal: params.protein_goal,
      carbs_goal: params.carbs_goal,
      fat_goal: params.fat_goal,
      calorie_goal: params.calorie_goal,
    })
    // Recalculate totals after rebalance
    totalKcal = 0; totalP = 0; totalG = 0; totalL = 0
    for (const foods of Object.values(day.repas)) {
      if (!Array.isArray(foods)) continue
      for (const item of foods) {
        totalKcal += item.kcal; totalP += item.proteines; totalG += item.glucides; totalL += item.lipides
      }
    }
  }

  return { ...day, total_kcal: totalKcal, total_protein: totalP, total_carbs: totalG, total_fat: totalL }
}

async function generateOneDay(
  runtime: MealGenerationRuntime,
  providerModel: string,
  day: string,
  params: MealGenerationParams,
  proteinsUsed: string[],
): Promise<{ day: LegacyDay; metadata: AiResultMetadata }> {
  const invocation = buildSequentialMealDayInvocation(day, params, proteinsUsed)
  const generated = await runtime.provider.generate({
    output: 'json', model: providerModel, maxTokens: invocation.maxTokens,
    system: invocation.system, messages: [{ role: 'user', content: [{ type: 'text', text: invocation.user }] }],
    validate: createAiOutputValidator(legacyNutritionDayOutputSchema),
  }, { correlationId: runtime.correlationId, timeoutMs: 300_000, cancellation: runtime.cancellation })
  if (!generated.ok) {
    if (generated.error.code === 'cancelled') throw new MealGenerationCancelledError(generated.metadata)
    throw new MealGenerationDayError(generated.error.code, generated.metadata)
  }
  return { day: verifyDayPlan(generated.value, params), metadata: generated.metadata }
}

type LegacyFood = { aliment: string; quantite_g: number; kcal: number; proteines: number; glucides: number; lipides: number }
type LegacyDay = { repas: Record<MealKey, LegacyFood[]>; total_kcal?: number; total_protein?: number; total_carbs?: number; total_fat?: number }

class MealGenerationDayError extends Error {
  constructor(readonly reason: string, readonly metadata: Partial<AiResultMetadata>) { super('Meal generation day failed') }
}

class MealGenerationCancelledError extends Error {
  constructor(readonly metadata: Partial<AiResultMetadata>) { super('Meal generation cancelled') }
}

export class MealGenerationError extends Error {
  constructor(readonly code: 'cancelled' | 'model_unavailable' | 'stream_failure', readonly usage: MealGenerationUsage) {
    super(code === 'cancelled' ? 'Génération annulée' : code === 'model_unavailable' ? 'Modèle IA indisponible' : 'Flux de réponse indisponible')
    this.name = 'MealGenerationError'
  }
}

interface UsageState {
  attempts: number
  providerModels: Set<string>
  inputTokens: number
  outputTokens: number
  inputKnown: number
  outputKnown: number
}

function recordUsage(state: UsageState, metadata: Partial<AiResultMetadata>): void {
  state.attempts += 1
  if (metadata.actualModel) state.providerModels.add(metadata.actualModel)
  if (metadata.usage?.inputTokens !== undefined) {
    state.inputTokens += metadata.usage.inputTokens
    state.inputKnown += 1
  }
  if (metadata.usage?.outputTokens !== undefined) {
    state.outputTokens += metadata.usage.outputTokens
    state.outputKnown += 1
  }
}

function usageResult(state: UsageState): MealGenerationUsage {
  const known = state.inputKnown > 0 || state.outputKnown > 0
  const complete = state.attempts > 0 && state.inputKnown === state.attempts && state.outputKnown === state.attempts
  return {
    attemptCount: state.attempts,
    ...(state.providerModels.size === 1 ? { providerModel: [...state.providerModels][0] } : {}),
    ...(known ? { tokens: { ...(state.inputKnown > 0 ? { inputTokens: state.inputTokens } : {}), ...(state.outputKnown > 0 ? { outputTokens: state.outputTokens } : {}) } } : {}),
    tokenCompleteness: complete ? 'complete' : known ? 'partial' : 'unavailable',
  }
}

export async function generateMealPlan(
  params: MealGenerationParams,
  runtime: MealGenerationRuntime,
  onProgress?: (event: { type: 'progress'; day: string; index: number; total: 7 }) => void,
): Promise<MealGenerationResult> {
  const model = resolveAiModel('anthropic-opus-4.8')
  const usageState: UsageState = { attempts: 0, providerModels: new Set(), inputTokens: 0, outputTokens: 0, inputKnown: 0, outputKnown: 0 }
  if (!model.ok || model.model.status !== 'active') throw new MealGenerationError('model_unavailable', usageResult(usageState))
  const plan: Record<string, DayPlan> = {}
  const proteinsUsed: string[] = []
  const failures: string[] = []
  for (let index = 0; index < DAYS.length; index += 1) {
    if (runtime.cancellation?.aborted) throw new MealGenerationError('cancelled', usageResult(usageState))
    const day = DAYS[index]
    try {
      onProgress?.({ type: 'progress', day, index: index + 1, total: 7 })
    } catch {
      throw new MealGenerationError('stream_failure', usageResult(usageState))
    }
    try {
      const generated = await generateOneDay(runtime, model.model.providerModelId, day, params, proteinsUsed)
      recordUsage(usageState, generated.metadata)
      const legacyDay = generated.day
      proteinsUsed.push(...extractProteins(legacyDay))
      plan[day] = convertLegacyDayToCanonical(legacyDay)
    } catch (error) {
      if (error instanceof MealGenerationCancelledError) {
        recordUsage(usageState, error.metadata)
        throw new MealGenerationError('cancelled', usageResult(usageState))
      }
      if (error instanceof MealGenerationDayError) recordUsage(usageState, error.metadata)
      failures.push(error instanceof MealGenerationDayError ? error.reason : 'unexpected_error')
      plan[day] = { meals: [], totals: { kcal: 0, prot: 0, carb: 0, fat: 0 } }
    }
  }
  return { ok: true, plan, partial: failures.length > 0, failedDays: failures.length, usage: usageResult(usageState) }
}
