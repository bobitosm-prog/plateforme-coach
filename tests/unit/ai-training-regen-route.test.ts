import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  users: [] as Array<Record<string, unknown>>,
  createClient: vi.fn(),
  startAiUsage: vi.fn(),
  finalize: vi.fn(),
  generateProgram: vi.fn(),
  loadExerciseCatalog: vi.fn(),
  customProgramWrites: vi.fn(),
  profileWrites: vi.fn(),
  writeEvent: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/ai/usage', () => ({
  aiUsageCorrelationId: () => 'cron-correlation',
  startAiUsage: mocks.startAiUsage,
}))
vi.mock('@/lib/ai/providers/anthropic', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/ai/providers/anthropic')>()),
  createAnthropicProvider: () => ({ generate: vi.fn() }),
}))
vi.mock('@/lib/training/generate-program', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/training/generate-program')>()),
  generateProgram: mocks.generateProgram,
}))
vi.mock('@/lib/training/load-exercise-catalog', () => ({ loadExerciseCatalog: mocks.loadExerciseCatalog }))
vi.mock('@/lib/api/route-observability', () => ({ writeApiRouteEvent: mocks.writeEvent }))

import { TrainingProgramGenerationError } from '@/lib/training/generate-program'
import { POST } from '@/app/api/training-regen/cron/route'

function adminClient() {
  const updateChain = { eq: vi.fn(() => updateChain) }
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') return {
        select: () => {
          const query = { eq: vi.fn(() => query), lte: vi.fn(async () => ({ data: mocks.users, error: null })) }
          return query
        },
        update: (value: unknown) => { mocks.profileWrites(value); return updateChain },
      }
      if (table === 'custom_programs') return {
        update: (value: unknown) => { mocks.customProgramWrites(value); return updateChain },
        insert: async (value: unknown) => { mocks.customProgramWrites(value); return { error: null } },
      }
      throw new Error(`unexpected table ${table}`)
    }),
  }
}

function request(controller = new AbortController()): NextRequest {
  return new Request('http://localhost/api/training-regen/cron', {
    method: 'POST', headers: { authorization: 'Bearer cron-secret' }, signal: controller.signal,
  }) as NextRequest
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'cron-secret'
  process.env.ANTHROPIC_API_KEY = 'local-test-key'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key'
  mocks.users = [{ id: 'user-1', objective: 'force', onboarding_answers: {}, training_location: 'gym', home_equipment: [], gender: 'male' }]
  mocks.createClient.mockReturnValue(adminClient())
  mocks.loadExerciseCatalog.mockResolvedValue([])
  mocks.startAiUsage.mockResolvedValue({ status: 'started', tracker: { finalize: mocks.finalize } })
  mocks.generateProgram.mockResolvedValue({ program_name: 'Programme', description: '', days: [] })
})

describe('training regeneration cron cancellation', () => {
  it('starts no usage or provider work when the request is already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    const response = await POST(request(controller))
    expect(response.status).toBe(200)
    expect(mocks.startAiUsage).not.toHaveBeenCalled()
    expect(mocks.generateProgram).not.toHaveBeenCalled()
    expect(mocks.customProgramWrites).not.toHaveBeenCalled()
  })

  it('passes cancellation, finalizes cancelled and persists no cancelled result', async () => {
    const controller = new AbortController()
    mocks.generateProgram.mockImplementation(async (_input, runtime) => {
      expect(runtime.cancellation).toBeDefined()
      controller.abort()
      throw new TrainingProgramGenerationError('cancelled')
    })

    const response = await POST(request(controller))
    expect(response.status).toBe(200)
    expect(mocks.finalize).toHaveBeenCalledOnce()
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'cancelled', reasonCode: 'request_cancelled' }))
    expect(mocks.customProgramWrites).not.toHaveBeenCalled()
    expect(await response.json()).toMatchObject({ success: 0, errors: 1, details: [{ status: 'error', error: 'request_cancelled' }] })
  })

  it('keeps completed work and does not start the following batch after cancellation', async () => {
    mocks.users = Array.from({ length: 4 }, (_, index) => ({
      id: `user-${index + 1}`, objective: 'force', onboarding_answers: {}, training_location: 'gym', home_equipment: [], gender: 'male',
    }))
    const controller = new AbortController()
    mocks.generateProgram.mockImplementation(async () => ({ program_name: 'Programme', description: '', days: [] }))
    mocks.finalize.mockImplementation(async input => {
      if (input.outcome === 'succeeded' && mocks.finalize.mock.calls.length === 3) controller.abort()
    })

    const response = await POST(request(controller))
    expect(response.status).toBe(200)
    expect(mocks.generateProgram).toHaveBeenCalledTimes(3)
    expect(mocks.startAiUsage).toHaveBeenCalledTimes(3)
    expect(mocks.customProgramWrites).toHaveBeenCalledTimes(6)
    expect(await response.json()).toMatchObject({ total: 4, success: 3, errors: 0 })
  })

  it('keeps the server principal and bounded public error codes', async () => {
    mocks.generateProgram.mockRejectedValue(new Error('private SQL or provider detail'))
    const response = await POST(request())
    expect(mocks.startAiUsage).toHaveBeenCalledWith(expect.objectContaining({
      feature: 'training-regen',
      principal: { kind: 'server', id: 'cron.training-regen', subjectUserId: 'user-1' },
    }))
    const serialized = JSON.stringify(await response.json())
    expect(serialized).toContain('persistence_failed')
    expect(serialized).not.toContain('private SQL or provider detail')
  })
})
