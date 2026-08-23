import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  limit: vi.fn(),
  getUserById: vi.fn(),
  createCoachClientRelation: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: mocks.from,
    auth: { admin: { getUserById: mocks.getUserById } },
  },
}))
vi.mock('@/lib/coach-relations/lifecycle-writer', () => ({
  createCoachClientRelation: mocks.createCoachClientRelation,
}))

import {
  assignConfiguredDefaultCoach,
  resolveDefaultCoachEmail,
} from '@/lib/coach-relations/default-assignment'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const COACH_ID = '33333333-3333-4333-8333-333333333333'

describe('configured default coach assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.from.mockReturnValue({ select: mocks.select })
    mocks.select.mockReturnValue({ eq: mocks.eq })
    mocks.eq.mockReturnValue({ limit: mocks.limit })
    mocks.limit.mockResolvedValue({
      data: [{ id: COACH_ID, role: 'coach' }],
      error: null,
    })
    mocks.getUserById.mockResolvedValue({ data: { user: { id: COACH_ID } }, error: null })
    mocks.createCoachClientRelation.mockResolvedValue({
      kind: 'created',
      relationId: 'relation-new',
      coachId: COACH_ID,
    })
  })

  it('prefers the server-only configuration and normalizes it', () => {
    expect(resolveDefaultCoachEmail(
      '  Default.Coach@Example.COM ',
      'legacy-public@example.com',
    )).toBe('default.coach@example.com')
  })

  it('uses the public variable only as a temporary server-side compatibility fallback', () => {
    expect(resolveDefaultCoachEmail(undefined, ' Legacy@Example.COM '))
      .toBe('legacy@example.com')
    expect(resolveDefaultCoachEmail(undefined, undefined)).toBeNull()
  })

  it('validates one coach profile and its auth user before canonical creation', async () => {
    await expect(assignConfiguredDefaultCoach({
      clientId: CLIENT_ID,
      actorId: CLIENT_ID,
      configuredEmail: 'default@example.com',
    })).resolves.toEqual({
      kind: 'created',
      relationId: 'relation-new',
      coachId: COACH_ID,
    })

    expect(mocks.from).toHaveBeenCalledWith('profiles')
    expect(mocks.eq).toHaveBeenCalledWith('email', 'default@example.com')
    expect(mocks.limit).toHaveBeenCalledWith(2)
    expect(mocks.getUserById).toHaveBeenCalledWith(COACH_ID)
    expect(mocks.createCoachClientRelation).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      coachId: COACH_ID,
      actorId: CLIENT_ID,
      source: 'default',
    })
  })

  it.each([
    ['missing configuration', null, [{ id: COACH_ID, role: 'coach' }]],
    ['missing profile', 'default@example.com', []],
    ['duplicate profiles', 'default@example.com', [
      { id: COACH_ID, role: 'coach' },
      { id: '44444444-4444-4444-8444-444444444444', role: 'coach' },
    ]],
    ['wrong role', 'default@example.com', [{ id: COACH_ID, role: 'client' }]],
  ])('fails closed for %s', async (_label, configuredEmail, profiles) => {
    mocks.limit.mockResolvedValue({ data: profiles, error: null })

    const result = await assignConfiguredDefaultCoach({
      clientId: CLIENT_ID,
      actorId: CLIENT_ID,
      configuredEmail,
    })

    expect(result.kind).toBe('error')
    expect(mocks.createCoachClientRelation).not.toHaveBeenCalled()
  })

  it('fails closed when the configured profile has no auth user', async () => {
    mocks.getUserById.mockResolvedValue({ data: { user: null }, error: null })

    await expect(assignConfiguredDefaultCoach({
      clientId: CLIENT_ID,
      actorId: CLIENT_ID,
      configuredEmail: 'default@example.com',
    })).resolves.toEqual({ kind: 'error', code: 'DEFAULT_COACH_INVALID' })

    expect(mocks.createCoachClientRelation).not.toHaveBeenCalled()
  })

  it('allows a new same-pair period after ended history through canonical create semantics', async () => {
    mocks.createCoachClientRelation.mockResolvedValue({
      kind: 'created',
      relationId: 'relation-period-2',
      coachId: COACH_ID,
    })

    await expect(assignConfiguredDefaultCoach({
      clientId: CLIENT_ID,
      actorId: CLIENT_ID,
      configuredEmail: 'default@example.com',
    })).resolves.toMatchObject({ kind: 'created', relationId: 'relation-period-2' })

    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20260823100000_add_canonical_coach_relation_writer.sql'),
      'utf8',
    )
    const createOperation = migration.slice(
      migration.indexOf("IF p_operation = 'create'"),
      migration.indexOf("IF active_count = 0"),
    )
    expect(createOperation).toContain("relation.status = 'active'")
    expect(createOperation).not.toContain("relation.status = 'ended'")
  })
})
