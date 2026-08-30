import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  EMPTY_INITIAL_GENERATION_SNAPSHOT,
  INITIAL_GENERATION_IDEMPOTENCY,
  runInitialGenerationAttempt,
  type InitialGenerationDomainPort,
  type InitialGenerationDomain,
  type InitialGenerationSnapshot,
  type QuotaCheckResult,
  type ResourceReadResult,
} from '@/lib/initial-generation/engine'
import {
  isValidInitialMealPlan,
  isValidInitialProgram,
} from '@/app/hooks/useInitialGeneration'

const hookSource = readFileSync(resolve(process.cwd(), 'app/hooks/useInitialGeneration.ts'), 'utf8')

function readySnapshot(overrides: Partial<InitialGenerationSnapshot> = {}): InitialGenerationSnapshot {
  return {
    training: { phase: 'ready' },
    nutrition: { phase: 'ready' },
    finalization: 'idle',
    ...overrides,
  }
}

function port({
  reads = [{ kind: 'ready' }],
  canGenerate = true,
  persist = true,
  blockedReason,
}: {
  reads?: ResourceReadResult[]
  canGenerate?: boolean
  persist?: boolean
  blockedReason?: 'coach_managed' | 'capability'
} = {}) {
  const queue = [...reads]
  const value: InitialGenerationDomainPort = {
    read: vi.fn(async (): Promise<ResourceReadResult> => (
      queue.shift() ?? reads.at(-1) ?? { kind: 'missing' }
    )),
    generate: vi.fn(async () => ({ valid: true })),
    validate: vi.fn(() => true),
    persist: vi.fn(async () => persist),
    canGenerate,
    blockedReason,
  }
  return value
}

type RunOptions = {
  training?: InitialGenerationDomainPort
  nutrition?: InitialGenerationDomainPort
  snapshot?: InitialGenerationSnapshot
  domains?: readonly InitialGenerationDomain[]
  quota?: QuotaCheckResult
  clear?: boolean
}

async function run({
  training = port(),
  nutrition = port(),
  snapshot = EMPTY_INITIAL_GENERATION_SNAPSHOT,
  domains = ['training', 'nutrition'] as const,
  quota = 'available',
  clear = true,
}: RunOptions = {}) {
  const clearFlag = vi.fn(async () => clear)
  const checkQuota = vi.fn(async () => quota)
  const result = await runInitialGenerationAttempt({
    snapshot,
    domains,
    ports: { training, nutrition },
    checkQuota,
    clearFlag,
  })
  return { result, clearFlag, checkQuota, training, nutrition }
}

describe('initial generation hardening', () => {
  it('does not generate when an existence read fails', async () => {
    const training = port({ reads: [{ kind: 'error', reason: 'read' }] })
    const { result } = await run({ training, domains: ['training'] })
    expect(training.generate).not.toHaveBeenCalled()
    expect(result.training).toEqual({ phase: 'error', reason: 'read' })
  })

  it('generates only a missing domain and confirms it with a post-write read', async () => {
    const nutrition = port({ reads: [{ kind: 'missing' }, { kind: 'missing' }, { kind: 'ready' }] })
    const { result, training, clearFlag } = await run({
      nutrition,
      snapshot: readySnapshot({ nutrition: { phase: 'idle' } }),
    })
    expect(training.generate).not.toHaveBeenCalled()
    expect(nutrition.generate).toHaveBeenCalledOnce()
    expect(nutrition.persist).toHaveBeenCalledOnce()
    expect(nutrition.read).toHaveBeenCalledTimes(3)
    expect(result.nutrition.phase).toBe('ready')
    expect(clearFlag).toHaveBeenCalledOnce()
  })

  it('does not generate a resource that already exists', async () => {
    const training = port({ reads: [{ kind: 'ready' }] })
    const { result } = await run({ training, domains: ['training'] })
    expect(training.generate).not.toHaveBeenCalled()
    expect(result.training.phase).toBe('ready')
  })

  it('keeps domains independent when one is ready and the other is missing', async () => {
    const training = port({ reads: [{ kind: 'ready' }] })
    const nutrition = port({ reads: [{ kind: 'missing' }, { kind: 'missing' }, { kind: 'ready' }] })
    await run({ training, nutrition })
    expect(training.generate).not.toHaveBeenCalled()
    expect(nutrition.generate).toHaveBeenCalledOnce()
  })

  it('does not mark an insert failure ready and does not clear the flag', async () => {
    const training = port({ reads: [{ kind: 'missing' }, { kind: 'missing' }], persist: false })
    const { result, clearFlag } = await run({
      training,
      domains: ['training'],
      snapshot: readySnapshot({ training: { phase: 'idle' } }),
    })
    expect(result.training).toEqual({ phase: 'error', reason: 'persistence' })
    expect(clearFlag).not.toHaveBeenCalled()
  })

  it('clears the flag only after both domains are confirmed ready', async () => {
    const partial = await run({
      training: port({ reads: [{ kind: 'ready' }] }),
      nutrition: port({ reads: [{ kind: 'error', reason: 'read' }] }),
    })
    expect(partial.clearFlag).not.toHaveBeenCalled()

    const complete = await run({
      training: port({ reads: [{ kind: 'ready' }] }),
      nutrition: port({ reads: [{ kind: 'ready' }] }),
    })
    expect(complete.clearFlag).toHaveBeenCalledOnce()
    expect(complete.result.finalization).toBe('ready')
  })

  it('surfaces a clear-flag failure as recoverable finalization error', async () => {
    const { result } = await run({ clear: false })
    expect(result.training.phase).toBe('ready')
    expect(result.nutrition.phase).toBe('ready')
    expect(result.finalization).toBe('error')
  })

  it('supports targeted retries and never regenerates a ready domain', async () => {
    const training = port({ reads: [{ kind: 'missing' }, { kind: 'missing' }, { kind: 'ready' }] })
    const nutrition = port({ reads: [{ kind: 'missing' }, { kind: 'missing' }, { kind: 'ready' }] })
    await run({
      training,
      nutrition,
      domains: ['training'],
      snapshot: readySnapshot({ training: { phase: 'error', reason: 'generation' } }),
    })
    expect(training.generate).toHaveBeenCalledOnce()
    expect(nutrition.generate).not.toHaveBeenCalled()

    const nutritionRetry = port({ reads: [{ kind: 'missing' }, { kind: 'missing' }, { kind: 'ready' }] })
    await run({
      nutrition: nutritionRetry,
      domains: ['nutrition'],
      snapshot: readySnapshot({ nutrition: { phase: 'error', reason: 'generation' } }),
    })
    expect(nutritionRetry.generate).toHaveBeenCalledOnce()

    const readyTraining = port()
    await run({ training: readyTraining, domains: ['training'], snapshot: readySnapshot() })
    expect(readyTraining.generate).not.toHaveBeenCalled()
  })

  it('blocks coach-managed and capability-denied generation', async () => {
    const coachManaged = port({ reads: [{ kind: 'missing' }], canGenerate: false, blockedReason: 'coach_managed' })
    const denied = port({ reads: [{ kind: 'missing' }], canGenerate: false, blockedReason: 'capability' })
    const coachResult = await run({ training: coachManaged, domains: ['training'] })
    const deniedResult = await run({ nutrition: denied, domains: ['nutrition'] })
    expect(coachManaged.generate).not.toHaveBeenCalled()
    expect(coachResult.result.training).toEqual({ phase: 'missing', reason: 'coach_managed' })
    expect(denied.generate).not.toHaveBeenCalled()
    expect(deniedResult.result.nutrition).toEqual({ phase: 'error', reason: 'capability' })
  })

  it('distinguishes quota exhaustion from quota read errors', async () => {
    const exhausted = await run({
      training: port({ reads: [{ kind: 'missing' }] }),
      domains: ['training'],
      quota: 'exhausted',
    })
    const unavailable = await run({
      nutrition: port({ reads: [{ kind: 'missing' }] }),
      domains: ['nutrition'],
      quota: 'error',
    })
    expect(exhausted.result.training.reason).toBe('quota_exhausted')
    expect(unavailable.result.nutrition.reason).toBe('quota_error')
  })

  it('documents safe write ordering, duplicate-run protection, and partial DB idempotency', () => {
    const trainingInsert = hookSource.indexOf(".from('custom_programs')\n        .insert")
    const trainingDeactivate = hookSource.indexOf(".from('custom_programs')\n        .update({ is_active: false })", trainingInsert)
    const mealInsert = hookSource.indexOf(".from('meal_plans')\n        .insert")
    const mealDeactivate = hookSource.indexOf(".from('meal_plans')\n        .update({ active: false })", mealInsert)
    expect(trainingInsert).toBeGreaterThan(-1)
    expect(trainingDeactivate).toBeGreaterThan(trainingInsert)
    expect(mealInsert).toBeGreaterThan(-1)
    expect(mealDeactivate).toBeGreaterThan(mealInsert)
    expect(hookSource).toContain(".lt('created_at', inserted.created_at)")
    expect(hookSource).toContain("'[initial-generation] training rollback failed'")
    expect(hookSource).toContain("'[initial-generation] nutrition rollback failed'")
    expect(hookSource).toContain('inFlightByUser')
    expect(hookSource).toContain('navigator.locks.request')
    expect(INITIAL_GENERATION_IDEMPOTENCY).toBe('PARTIAL')
  })

  it('never carries raw provider or database errors into user state', async () => {
    const training = port({ reads: [{ kind: 'missing' }] })
    training.generate = vi.fn(async () => { throw new Error('SECRET_PROVIDER_DETAIL') })
    const { result } = await run({ training, domains: ['training'] })
    expect(result.training).toEqual({ phase: 'error', reason: 'generation' })
    expect(JSON.stringify(result)).not.toContain('SECRET_PROVIDER_DETAIL')
  })

  it('rejects incomplete generated payloads before persistence', () => {
    expect(isValidInitialProgram({ days: [] })).toBe(false)
    expect(isValidInitialProgram({ days: [{ exercises: [{ name: 'Squat' }] }] })).toBe(true)
    expect(isValidInitialMealPlan({ lundi: { meals: [] } })).toBe(false)
    expect(isValidInitialMealPlan(Object.fromEntries(
      Array.from({ length: 7 }, (_, index) => [`day-${index}`, { meals: [{ name: 'Meal' }] }]),
    ))).toBe(true)
  })
})
