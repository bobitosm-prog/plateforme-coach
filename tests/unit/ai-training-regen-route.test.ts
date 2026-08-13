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
  profileFilters: vi.fn(),
  writeOrder: vi.fn(),
  writeEvent: vi.fn(),
  deactivationError: null as unknown,
  insertError: null as unknown,
  profileUpdateError: null as unknown,
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
  const mutationChain = (error: unknown) => {
    const chain = {
      eq: vi.fn(() => chain),
      then: (resolve: (value: { error: unknown }) => unknown, reject?: (reason: unknown) => unknown) => (
        Promise.resolve({ error }).then(resolve, reject)
      ),
    }
    return chain
  }
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') return {
        select: () => {
          const query = {
            eq: vi.fn((...args: unknown[]) => { mocks.profileFilters('eq', ...args); return query }),
            lte: vi.fn(async (...args: unknown[]) => {
              mocks.profileFilters('lte', ...args)
              return { data: mocks.users, error: null }
            }),
          }
          return query
        },
        update: (value: unknown) => {
          mocks.profileWrites(value)
          mocks.writeOrder('profile-update')
          return mutationChain(mocks.profileUpdateError)
        },
      }
      if (table === 'custom_programs') return {
        update: (value: unknown) => {
          mocks.customProgramWrites(value)
          mocks.writeOrder('deactivate')
          return mutationChain(mocks.deactivationError)
        },
        insert: async (value: unknown) => {
          mocks.customProgramWrites(value)
          mocks.writeOrder('insert')
          return { error: mocks.insertError }
        },
      }
      throw new Error(`unexpected table ${table}`)
    }),
  }
}

function request(
  controller = new AbortController(),
  authorization = 'Bearer cron-secret',
): NextRequest {
  return new Request('http://localhost/api/training-regen/cron', {
    method: 'POST', headers: { authorization }, signal: controller.signal,
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
  mocks.deactivationError = null
  mocks.insertError = null
  mocks.profileUpdateError = null
})

describe('training regeneration cron contract', () => {
  it('fails closed when CRON_SECRET is missing or the bearer credential is invalid', async () => {
    process.env.CRON_SECRET = ''
    expect((await POST(request())).status).toBe(500)
    expect(mocks.createClient).not.toHaveBeenCalled()

    process.env.CRON_SECRET = 'cron-secret'
    expect((await POST(request(new AbortController(), 'Bearer invalid'))).status).toBe(401)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('selects due onboarded clients and generates before ordered privileged writes', async () => {
    mocks.generateProgram.mockImplementation(async () => {
      mocks.writeOrder('generate')
      return { program_name: 'Programme', description: '', days: [] }
    })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mocks.createClient).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    expect(mocks.profileFilters.mock.calls).toEqual([
      ['eq', 'role', 'client'],
      ['eq', 'onboarding_completed', true],
      ['lte', 'next_program_regen_at', expect.any(String)],
    ])
    expect(mocks.writeOrder.mock.calls.map(call => call[0])).toEqual([
      'generate', 'deactivate', 'insert', 'profile-update',
    ])
    expect(mocks.customProgramWrites).toHaveBeenLastCalledWith(expect.objectContaining({
      user_id: 'user-1', source: 'cron_auto', is_active: true,
    }))
    expect(mocks.profileWrites).toHaveBeenCalledWith({
      next_program_regen_at: expect.any(String),
    })
  })

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

  it('characterizes a returned deactivation error as currently non-blocking', async () => {
    mocks.deactivationError = { code: 'DEACTIVATE_FAILED' }

    const response = await POST(request())

    expect(await response.json()).toMatchObject({ success: 1, errors: 0 })
    expect(mocks.writeOrder.mock.calls.map(call => call[0])).toEqual([
      'deactivate', 'insert', 'profile-update',
    ])
  })

  it('characterizes an insertion failure after deactivation as leaving the due date unchanged', async () => {
    mocks.insertError = { code: 'INSERT_FAILED' }

    const response = await POST(request())

    expect(await response.json()).toMatchObject({
      success: 0,
      errors: 1,
      details: [{ status: 'error', error: 'persistence_failed' }],
    })
    expect(mocks.writeOrder.mock.calls.map(call => call[0])).toEqual(['deactivate', 'insert'])
    expect(mocks.profileWrites).not.toHaveBeenCalled()
  })

  it('characterizes a returned due-date update error as currently ignored after insertion', async () => {
    mocks.profileUpdateError = { code: 'PROFILE_UPDATE_FAILED' }

    const response = await POST(request())

    expect(await response.json()).toMatchObject({ success: 1, errors: 0 })
    expect(mocks.writeOrder.mock.calls.map(call => call[0])).toEqual([
      'deactivate', 'insert', 'profile-update',
    ])
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'succeeded' }))
  })
})
