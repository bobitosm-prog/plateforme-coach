import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../../lib/supabase/types'
import {
  COACH_PROGRAM_PROJECTION,
  createTrainingProgramRepository,
} from '../../lib/repositories/training'
import {
  COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
  COACH_TEMPLATE_STAGING_PROJECT_REF,
} from '../../lib/training/coexistence/coach-template-technical-staging-go-contract'
import {
  COACH_TEMPLATE_STAGING_SERVING_OPT_IN,
  COACH_TEMPLATE_VALIDATED_TECHNICAL_STAGING_GO,
  resolveCoachTemplateStagingServingActivation,
  resolveCoachTemplateStagingServingControl,
} from '../../lib/training/coexistence/coach-template-staging-serving-activation'

const exactInput = () => ({
  applicationEnvironment: 'staging',
  deploymentEnvironment: 'preview',
  branch: 'phase-6-staging',
  projectRef: COACH_TEMPLATE_STAGING_PROJECT_REF,
  rolloutOptIn: COACH_TEMPLATE_STAGING_SERVING_OPT_IN,
  technicalDecision: COACH_TEMPLATE_VALIDATED_TECHNICAL_STAGING_GO,
})

const exactEnvironment = () => ({
  NEXT_PUBLIC_COACH_TEMPLATE_STAGING_AUTHORITY: 'staging',
  NEXT_PUBLIC_COACH_TEMPLATE_STAGING_DEPLOYMENT: 'preview',
  NEXT_PUBLIC_COACH_TEMPLATE_STAGING_BRANCH: 'phase-6-staging',
  NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN: COACH_TEMPLATE_STAGING_SERVING_OPT_IN,
  NEXT_PUBLIC_SUPABASE_URL: `https://${COACH_TEMPLATE_STAGING_PROJECT_REF}.supabase.co`,
})

function clientWith(data: unknown[]) {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'or', 'is', 'gt']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args })
      return chain
    })
  }
  chain.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) => (
    Promise.resolve({ data, error: null }).then(resolve)
  )
  const client = { from: vi.fn(() => chain) } as unknown as DatabaseClient
  return { client, chain, calls, from: client.from as ReturnType<typeof vi.fn> }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('coach-template bounded staging serving activation', () => {
  it('creates the existing canonical control only with every exact staging condition', () => {
    expect(resolveCoachTemplateStagingServingActivation(exactInput())).toEqual({
      mode: 'canonical-when-identical',
      control: { mode: 'canonical-when-identical', dependencies: {} },
      realCorpusStatus: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
      productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
      rollback: 'REMOVE_STAGING_ROLLOUT_OPT_IN',
    })
  })

  it.each([
    ['missing opt-in', { rolloutOptIn: undefined }],
    ['unknown opt-in', { rolloutOptIn: 'enabled' }],
    ['production authority', { applicationEnvironment: 'production' }],
    ['production deployment', { deploymentEnvironment: 'production' }],
    ['wrong deployment', { deploymentEnvironment: 'development' }],
    ['wrong branch', { branch: 'main' }],
    ['wrong project', { projectRef: 'njlzossopgknanhkzcbk' }],
    ['unknown project', { projectRef: undefined }],
    ['missing technical GO', { technicalDecision: undefined }],
  ])('fails closed to legacy-only for %s', (_label, override) => {
    const result = resolveCoachTemplateStagingServingActivation({ ...exactInput(), ...override })
    expect(result).toEqual({
      mode: 'legacy-only',
      realCorpusStatus: COACH_TEMPLATE_REAL_CORPUS_VALIDATION_PENDING,
      productionPromotion: 'PRODUCTION_PROMOTION_FORBIDDEN',
      rollback: 'REMOVE_STAGING_ROLLOUT_OPT_IN',
    })
  })

  it('rejects a contradictory or incomplete technical GO attestation', () => {
    for (const technicalDecision of [
      { ...COACH_TEMPLATE_VALIDATED_TECHNICAL_STAGING_GO, technicalStatus: 'TECHNICAL_STAGING_NO_GO' as const },
      { ...COACH_TEMPLATE_VALIDATED_TECHNICAL_STAGING_GO, reasons: ['UNSUPPORTED_PRESENT'] as const },
      {
        ...COACH_TEMPLATE_VALIDATED_TECHNICAL_STAGING_GO,
        evidence: { ...COACH_TEMPLATE_VALIDATED_TECHNICAL_STAGING_GO.evidence, fixtureCleanupComplete: false },
      },
    ]) {
      expect(resolveCoachTemplateStagingServingActivation({
        ...exactInput(), technicalDecision,
      }).mode).toBe('legacy-only')
    }
  })

  it('uses only explicit public staging inputs and rolls back by removing the opt-in', () => {
    expect(resolveCoachTemplateStagingServingControl(exactEnvironment())).toEqual({
      mode: 'canonical-when-identical', dependencies: {},
    })
    expect(resolveCoachTemplateStagingServingControl({
      ...exactEnvironment(), NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN: undefined,
    })).toBeUndefined()
    expect(resolveCoachTemplateStagingServingControl({
      ...exactEnvironment(), NEXT_PUBLIC_SUPABASE_URL: 'https://njlzossopgknanhkzcbk.supabase.co',
    })).toBeUndefined()
    expect(resolveCoachTemplateStagingServingControl({
      ...exactEnvironment(), NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
    })).toBeUndefined()
  })

  it('serves an identical canonical projection through listCoachProgramPage after one unchanged read', async () => {
    for (const [key, value] of Object.entries(exactEnvironment())) vi.stubEnv(key, value)
    const row = {
      id: 'template-canonical',
      coach_id: 'coach-id',
      name: 'Template canonical',
      description: 'Description',
      is_template: true,
      tags: ['PPL'],
      program: {
        days: [{
          name: 'Push',
          exercises: [{ exercise_id: 'bench', name: 'Développé couché', sets: 3, reps: '8-12', rest: 90 }],
        }],
      },
      created_at: '2026-08-13T10:00:00.000Z',
    }
    const mock = clientWith([row])
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const result = await createTrainingProgramRepository(mock.client).listCoachProgramPage('coach-id')

    expect(result.ok && result.data.items[0]).toEqual(row)
    expect(result.ok && result.data.items[0]).not.toBe(row)
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(mock.from).toHaveBeenCalledWith('training_programs')
    expect(mock.chain.select).toHaveBeenCalledTimes(1)
    expect(mock.chain.select).toHaveBeenCalledWith(COACH_PROGRAM_PROJECTION)
    expect(mock.calls.filter(call => call.method === 'eq').map(call => call.args)).toEqual([
      ['coach_id', 'coach-id'], ['is_template', true],
    ])
    expect(mock.calls.filter(call => call.method === 'order').map(call => call.args)).toEqual([
      ['created_at', { ascending: false, nullsFirst: false }],
      ['id', { ascending: true }],
    ])
    expect(mock.chain.limit).toHaveBeenCalledTimes(1)
    expect(mock.chain.limit).toHaveBeenCalledWith(21)
  })

  it('keeps the exact legacy row when the staging opt-in is absent', async () => {
    const environment = exactEnvironment()
    for (const [key, value] of Object.entries(environment)) {
      if (key !== 'NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN') vi.stubEnv(key, value)
    }
    vi.stubEnv('NEXT_PUBLIC_COACH_TEMPLATE_STAGING_OPT_IN', '')
    const row = {
      id: 'template-rollback', coach_id: 'coach-id', name: 'Rollback', description: null,
      is_template: true, tags: [], program: { someday: [] }, created_at: null,
    }
    const mock = clientWith([row])
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const result = await createTrainingProgramRepository(mock.client).listCoachProgramPage('coach-id')
    expect(result.ok && result.data.items[0]).toBe(row)
    expect(mock.from).toHaveBeenCalledTimes(1)
    expect(mock.chain.select).toHaveBeenCalledTimes(1)
  })
})
