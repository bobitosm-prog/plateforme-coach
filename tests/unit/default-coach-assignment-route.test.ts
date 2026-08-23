import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseRouteClient: vi.fn(),
  checkRateLimit: vi.fn(),
  assignConfiguredDefaultCoach: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: mocks.createSupabaseRouteClient,
}))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock('@/lib/coach-relations/default-assignment', () => ({
  assignConfiguredDefaultCoach: mocks.assignConfiguredDefaultCoach,
  resolveDefaultCoachEmail: (serverEmail?: string, compatibilityEmail?: string) => {
    const configuredEmail = serverEmail?.trim() || compatibilityEmail?.trim()
    return configuredEmail ? configuredEmail.toLowerCase() : null
  },
}))

import { POST } from '@/app/api/coach/default-assignment/route'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const COACH_ID = '33333333-3333-4333-8333-333333333333'

function sessionClient(userId: string | null, role: string) {
  const single = vi.fn().mockResolvedValue({ data: userId ? { role } : null, error: null })
  const eq = vi.fn().mockReturnValue({ single })
  const from = vi.fn((table: string) => {
    if (table === 'profiles') return { select: vi.fn().mockReturnValue({ eq }) }
    throw new Error(`Unexpected table: ${table}`)
  })
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    from,
  }
}

function request(body?: unknown) {
  return new Request('http://localhost/api/coach/default-assignment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

describe('POST /api/coach/default-assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('DEFAULT_COACH_EMAIL', 'server-default@example.com')
    vi.stubEnv('NEXT_PUBLIC_COACH_EMAIL', 'legacy-public@example.com')
    mocks.checkRateLimit.mockReturnValue({ allowed: true, remaining: 9 })
    mocks.assignConfiguredDefaultCoach.mockResolvedValue({
      kind: 'created',
      relationId: 'relation-new',
      coachId: COACH_ID,
    })
  })

  it('rejects anonymous callers', async () => {
    mocks.createSupabaseRouteClient.mockResolvedValue(sessionClient(null, 'client'))

    const response = await POST(request() as never)

    expect(response.status).toBe(401)
    expect(mocks.assignConfiguredDefaultCoach).not.toHaveBeenCalled()
  })

  it('rejects arbitrary client and coach authority in the body', async () => {
    mocks.createSupabaseRouteClient.mockResolvedValue(sessionClient(CLIENT_ID, 'client'))

    const response = await POST(request({
      clientId: '22222222-2222-4222-8222-222222222222',
      coachId: COACH_ID,
    }) as never)

    expect(response.status).toBe(400)
    expect(mocks.assignConfiguredDefaultCoach).not.toHaveBeenCalled()
  })

  it('rejects authenticated non-client roles', async () => {
    mocks.createSupabaseRouteClient.mockResolvedValue(sessionClient(COACH_ID, 'coach'))

    const response = await POST(request() as never)

    expect(response.status).toBe(403)
    expect(mocks.assignConfiguredDefaultCoach).not.toHaveBeenCalled()
  })

  it('creates the default relation from server identity only', async () => {
    mocks.createSupabaseRouteClient.mockResolvedValue(sessionClient(CLIENT_ID, 'client'))

    const response = await POST(request() as never)

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ outcome: 'created', relationId: 'relation-new' })
    expect(mocks.assignConfiguredDefaultCoach).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      actorId: CLIENT_ID,
      configuredEmail: 'server-default@example.com',
    })
  })

  it('maps same-coach retries to an idempotent success', async () => {
    mocks.createSupabaseRouteClient.mockResolvedValue(sessionClient(CLIENT_ID, 'client'))
    mocks.assignConfiguredDefaultCoach.mockResolvedValue({
      kind: 'already_active_same_coach',
      relationId: 'relation-existing',
      coachId: COACH_ID,
    })

    const response = await POST(request({}) as never)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      outcome: 'already_active_same_coach',
      relationId: 'relation-existing',
    })
  })

  it('preserves another active coach without replacement', async () => {
    mocks.createSupabaseRouteClient.mockResolvedValue(sessionClient(CLIENT_ID, 'client'))
    mocks.assignConfiguredDefaultCoach.mockResolvedValue({
      kind: 'conflict',
      code: 'RELATION_ACTIVE_COACH_CONFLICT',
      coachId: '44444444-4444-4444-8444-444444444444',
    })

    const response = await POST(request() as never)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      outcome: 'active_relation_preserved',
      code: 'RELATION_ACTIVE_COACH_CONFLICT',
    })
  })

  it('fails closed when the configured default coach is unavailable', async () => {
    mocks.createSupabaseRouteClient.mockResolvedValue(sessionClient(CLIENT_ID, 'client'))
    mocks.assignConfiguredDefaultCoach.mockResolvedValue({
      kind: 'error',
      code: 'DEFAULT_COACH_INVALID',
    })

    const response = await POST(request() as never)

    expect(response.status).toBe(503)
    expect(mocks.assignConfiguredDefaultCoach).toHaveBeenCalledOnce()
  })

  it('uses a reliable authenticated dashboard trigger and keeps entitlement separate', () => {
    const root = process.cwd()
    const dashboard = readFileSync(resolve(root, 'app/hooks/useClientDashboard.ts'), 'utf8')
    const route = readFileSync(resolve(root, 'app/api/coach/default-assignment/route.ts'), 'utf8')
    const service = readFileSync(resolve(root, 'lib/coach-relations/default-assignment.ts'), 'utf8')
    const writer = readFileSync(resolve(root, 'lib/coach-relations/lifecycle-writer.ts'), 'utf8')
    const sources = [route, service, writer].join('\n')

    expect(dashboard).toContain("fetch('/api/coach/default-assignment', { method: 'POST' })")
    expect(dashboard).toContain('if (!assignmentResponse.ok && assignmentResponse.status !== 409)')
    expect(dashboard).toContain('Default coach assignment request failed')
    expect(sources).toContain("rpc('transition_coach_client_relation'")
    expect(sources).toContain("p_source: source")
    expect(sources).not.toContain('subscription_type')
    expect(sources).not.toContain('subscription_status')
    expect(sources).not.toContain('trial_ends_at')
    expect(sources).not.toMatch(/stripe|entitlement/i)
  })
})
