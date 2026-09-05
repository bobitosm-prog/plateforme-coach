import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseRouteClient: vi.fn(),
  checkRateLimit: vi.fn(),
  findActiveCoachForClient: vi.fn(),
  findActiveBetween: vi.fn(),
  endCoachClientRelation: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: mocks.createSupabaseRouteClient,
}))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock('@/lib/coach-relations/repository', () => ({
  findActiveCoachForClient: mocks.findActiveCoachForClient,
  findActiveBetween: mocks.findActiveBetween,
}))
vi.mock('@/lib/coach-relations/lifecycle-writer', () => ({
  endCoachClientRelation: mocks.endCoachClientRelation,
}))

import { POST as disconnectClient } from '@/app/api/coach/disconnect/route'
import { POST as endClientAsCoach } from '@/app/api/coach/clients/end/route'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const COACH_ID = '33333333-3333-4333-8333-333333333333'
const OTHER_COACH_ID = '44444444-4444-4444-8444-444444444444'

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

function request(path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

function activeRelation(coachId = COACH_ID, clientId = CLIENT_ID) {
  return {
    kind: 'active',
    relation: {
      id: 'relation-active',
      coach_id: coachId,
      client_id: clientId,
      status: 'active',
      source: 'invitation',
    },
  }
}

describe('coach relation end endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkRateLimit.mockReturnValue({ allowed: true, remaining: 4 })
    mocks.endCoachClientRelation.mockResolvedValue({ kind: 'ended', relationId: 'relation-active' })
    mocks.findActiveCoachForClient.mockResolvedValue(activeRelation())
    mocks.findActiveBetween.mockResolvedValue(activeRelation())
  })

  it('rejects an anonymous disconnect before relation access', async () => {
    const client = sessionClient(null, 'client')
    mocks.createSupabaseRouteClient.mockResolvedValue(client)

    const response = await disconnectClient(request('/api/coach/disconnect') as never)

    expect(response.status).toBe(401)
    expect(mocks.findActiveCoachForClient).not.toHaveBeenCalled()
    expect(mocks.endCoachClientRelation).not.toHaveBeenCalled()
  })

  it('lets a client end only their own resolved active relation and ignores body authority', async () => {
    const client = sessionClient(CLIENT_ID, 'client')
    mocks.createSupabaseRouteClient.mockResolvedValue(client)

    const response = await disconnectClient(request('/api/coach/disconnect', {
      clientId: OTHER_CLIENT_ID,
      coachId: OTHER_COACH_ID,
    }) as never)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ outcome: 'ended', relationId: 'relation-active' })
    expect(mocks.findActiveCoachForClient).toHaveBeenCalledWith(client, CLIENT_ID)
    expect(mocks.endCoachClientRelation).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      coachId: COACH_ID,
      actorId: CLIENT_ID,
      reason: 'client_request',
    })
  })

  it('is idempotent when a client repeats disconnect after the relation ended', async () => {
    const client = sessionClient(CLIENT_ID, 'client')
    mocks.createSupabaseRouteClient.mockResolvedValue(client)
    mocks.findActiveCoachForClient
      .mockResolvedValueOnce(activeRelation())
      .mockResolvedValueOnce({ kind: 'not_found' })

    const first = await disconnectClient(request('/api/coach/disconnect') as never)
    const second = await disconnectClient(request('/api/coach/disconnect') as never)

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    await expect(second.json()).resolves.toEqual({ outcome: 'no_active_relation' })
    expect(mocks.endCoachClientRelation).toHaveBeenCalledOnce()
  })

  it('rejects a non-client user from the self-service route', async () => {
    mocks.createSupabaseRouteClient.mockResolvedValue(sessionClient(COACH_ID, 'coach'))

    const response = await disconnectClient(request('/api/coach/disconnect') as never)

    expect(response.status).toBe(403)
    expect(mocks.findActiveCoachForClient).not.toHaveBeenCalled()
    expect(mocks.endCoachClientRelation).not.toHaveBeenCalled()
  })

  it('lets a coach end an exact active relation', async () => {
    const client = sessionClient(COACH_ID, 'coach')
    mocks.createSupabaseRouteClient.mockResolvedValue(client)

    const response = await endClientAsCoach(request('/api/coach/clients/end', {
      clientId: CLIENT_ID,
    }) as never)

    expect(response.status).toBe(200)
    expect(mocks.findActiveBetween).toHaveBeenCalledWith(client, COACH_ID, CLIENT_ID)
    expect(mocks.endCoachClientRelation).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      coachId: COACH_ID,
      actorId: COACH_ID,
      reason: 'coach_request',
    })
  })

  it('rejects an anonymous coach-end request before parsing body or relation access', async () => {
    const client = sessionClient(null, 'coach')
    mocks.createSupabaseRouteClient.mockResolvedValue(client)

    const response = await endClientAsCoach(request('/api/coach/clients/end', {
      clientId: CLIENT_ID,
    }) as never)

    expect(response.status).toBe(401)
    expect(mocks.findActiveBetween).not.toHaveBeenCalled()
    expect(mocks.endCoachClientRelation).not.toHaveBeenCalled()
  })

  it('prevents another coach from ending a relation they do not own', async () => {
    const client = sessionClient(OTHER_COACH_ID, 'coach')
    mocks.createSupabaseRouteClient.mockResolvedValue(client)
    mocks.findActiveBetween.mockResolvedValue({ kind: 'not_found' })

    const response = await endClientAsCoach(request('/api/coach/clients/end', {
      clientId: CLIENT_ID,
    }) as never)

    expect(response.status).toBe(404)
    expect(mocks.findActiveBetween).toHaveBeenCalledWith(client, OTHER_COACH_ID, CLIENT_ID)
    expect(mocks.endCoachClientRelation).not.toHaveBeenCalled()
  })

  it('returns no-active when a coach targets a client without an active relation', async () => {
    const client = sessionClient(COACH_ID, 'coach')
    mocks.createSupabaseRouteClient.mockResolvedValue(client)
    mocks.findActiveBetween.mockResolvedValue({ kind: 'not_found' })

    const response = await endClientAsCoach(request('/api/coach/clients/end', {
      clientId: OTHER_CLIENT_ID,
    }) as never)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ outcome: 'no_active_relation' })
    expect(mocks.findActiveBetween).toHaveBeenCalledWith(client, COACH_ID, OTHER_CLIENT_ID)
    expect(mocks.endCoachClientRelation).not.toHaveBeenCalled()
  })

  it('rejects arbitrary or malformed client authority in the coach route', async () => {
    const client = sessionClient(COACH_ID, 'coach')
    mocks.createSupabaseRouteClient.mockResolvedValue(client)

    const response = await endClientAsCoach(request('/api/coach/clients/end', {
      clientId: 'not-a-uuid',
      coachId: OTHER_COACH_ID,
    }) as never)

    expect(response.status).toBe(400)
    expect(mocks.findActiveBetween).not.toHaveBeenCalled()
    expect(mocks.endCoachClientRelation).not.toHaveBeenCalled()
  })

  it('rejects an unsupported role from the coach route', async () => {
    mocks.createSupabaseRouteClient.mockResolvedValue(sessionClient(OTHER_CLIENT_ID, 'client'))

    const response = await endClientAsCoach(request('/api/coach/clients/end', {
      clientId: CLIENT_ID,
    }) as never)

    expect(response.status).toBe(403)
    expect(mocks.endCoachClientRelation).not.toHaveBeenCalled()
  })

  it('uses only the canonical writer and preserves lifecycle history fields', () => {
    const root = process.cwd()
    const migration = readFileSync(
      resolve(root, 'supabase/migrations/20260823100000_add_canonical_coach_relation_writer.sql'),
      'utf8',
    )
    const routes = [
      readFileSync(resolve(root, 'app/api/coach/disconnect/route.ts'), 'utf8'),
      readFileSync(resolve(root, 'app/api/coach/clients/end/route.ts'), 'utf8'),
      readFileSync(resolve(root, 'lib/coach-relations/lifecycle-writer.ts'), 'utf8'),
      readFileSync(resolve(root, 'app/components/tabs/profile/CoachSection.tsx'), 'utf8'),
    ].join('\n')

    expect(routes).toContain("rpc('transition_coach_client_relation'")
    expect(routes).toContain("fetch('/api/coach/disconnect', { method: 'POST' })")
    expect(routes).not.toMatch(/\.from\(['"]coach_clients['"]\)[\s\S]*\.delete/)
    expect(routes).not.toContain('subscription_type')
    expect(routes).not.toContain('subscription_status')
    expect(routes).not.toContain('trial_ends_at')
    expect(migration).toContain("status = 'ended'")
    expect(migration).toContain('ended_at = transition_time')
    expect(migration).toContain('ended_by = p_actor_id')
    expect(migration).toContain('end_reason = p_end_reason')
    expect(migration).not.toContain('UPDATE public.coach_clients\n    SET coach_id')

    const endOperation = migration.slice(
      migration.indexOf("IF p_operation = 'end'"),
      migration.indexOf('IF active_relation.coach_id = p_coach_id'),
    )
    expect(endOperation).not.toContain('started_at =')
    expect(endOperation).not.toContain('source =')
    expect(endOperation).not.toContain('created_at =')
    expect(endOperation).not.toContain('DELETE')
  })
})
