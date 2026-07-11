import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const mutationOrder: string[] = []
  const authGetUser = vi.fn()
  const createServerClient = vi.fn(() => ({ auth: { getUser: authGetUser } }))
  const cookies = vi.fn(async () => ({ getAll: vi.fn(() => []) }))

  const defaultCoachMaybeSingle = vi.fn()
  const defaultCoachEq = vi.fn(() => ({ maybeSingle: defaultCoachMaybeSingle }))
  const profileSelect = vi.fn(() => ({ eq: defaultCoachEq }))

  const profileUpdateEq = vi.fn(async (): Promise<{ error: null | { message: string } }> => {
    mutationOrder.push('profiles.update')
    return { error: null }
  })
  const profileUpdate = vi.fn(() => ({ eq: profileUpdateEq }))

  const coachClientsUpsert = vi.fn(async (): Promise<{ error: null | { message: string } }> => {
    mutationOrder.push('coach_clients.upsert')
    return { error: null }
  })

  const adminFrom = vi.fn((table: string) => {
    if (table === 'profiles') {
      return { select: profileSelect, update: profileUpdate }
    }
    if (table === 'coach_clients') {
      return { upsert: coachClientsUpsert }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
  const createClient = vi.fn(() => ({ from: adminFrom }))

  return {
    mutationOrder,
    authGetUser,
    createServerClient,
    cookies,
    defaultCoachMaybeSingle,
    profileSelect,
    defaultCoachEq,
    profileUpdate,
    profileUpdateEq,
    coachClientsUpsert,
    adminFrom,
    createClient,
  }
})

vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('next/headers', () => ({ cookies: mocks.cookies }))

import { POST } from '../../app/api/assign-coach/route'

const USER_ID = '00000000-0000-4000-8000-000000000001'
const FORGED_CLIENT_ID = '00000000-0000-4000-8000-000000000002'
const COACH_ID = '00000000-0000-4000-8000-000000000003'
const DEFAULT_COACH_ID = '00000000-0000-4000-8000-000000000004'

const originalEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_COACH_EMAIL: process.env.NEXT_PUBLIC_COACH_EMAIL,
}

function request(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/assign-coach', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

function authenticatedAs(id = USER_ID, role = 'client') {
  mocks.authGetUser.mockResolvedValue({
    data: { user: { id, email: `${role}@example.test`, user_metadata: { role } } },
  })
}

function expectInvitedProfileMutation(clientId = USER_ID) {
  expect(mocks.profileUpdate).toHaveBeenCalledWith({
    role: 'client',
    subscription_status: 'active',
    subscription_type: 'invited',
    trial_ends_at: null,
  })
  expect(mocks.profileUpdateEq).toHaveBeenCalledWith('id', clientId)
}

function expectCoachClientUpsert(
  coachId: string,
  clientId = USER_ID,
  invitedByCoach = true,
) {
  expect(mocks.coachClientsUpsert).toHaveBeenCalledWith(
    {
      coach_id: coachId,
      client_id: clientId,
      status: 'active',
      invited_by_coach: invitedByCoach,
    },
    { onConflict: 'coach_id,client_id' },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.mutationOrder.length = 0
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_test'
  process.env.NEXT_PUBLIC_COACH_EMAIL = 'default-coach@example.test'

  authenticatedAs()
  mocks.defaultCoachMaybeSingle.mockResolvedValue({
    data: { id: DEFAULT_COACH_ID },
    error: null,
  })
  mocks.profileUpdateEq.mockImplementation(async () => {
    mocks.mutationOrder.push('profiles.update')
    return { error: null }
  })
  mocks.coachClientsUpsert.mockImplementation(async () => {
    mocks.mutationOrder.push('coach_clients.upsert')
    return { error: null }
  })
})

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key as keyof NodeJS.ProcessEnv]
    else process.env[key as keyof NodeJS.ProcessEnv] = value
  }
})

describe('POST /api/assign-coach — current authorization behavior', () => {
  describe('authentication and target identity', () => {
    it('returns 401 for an anonymous request before creating the service-role client', async () => {
      mocks.authGetUser.mockResolvedValue({ data: { user: null } })

      const response = await POST(request({ coachId: COACH_ID }))

      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toEqual({ error: 'Non autorisé' })
      expect(mocks.createClient).not.toHaveBeenCalled()
      expect(mocks.profileUpdate).not.toHaveBeenCalled()
      expect(mocks.coachClientsUpsert).not.toHaveBeenCalled()
    })

    it.each([
      ['standard user', 'client'],
      ['invited user', 'invited'],
      ['lifetime user', 'lifetime'],
      ['coach', 'coach'],
      ['administrator', 'admin'],
    ])('grants invited access to an authenticated %s without checking its role', async (_label, role) => {
      authenticatedAs(USER_ID, role)

      const response = await POST(request({ coachId: COACH_ID }))

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        success: true,
        coachId: COACH_ID,
        autoAssign: false,
      })
      expectInvitedProfileMutation()
      expectCoachClientUpsert(COACH_ID)
    })

    it('ignores a forged clientId and always mutates the authenticated user', async () => {
      const response = await POST(request({
        coachId: COACH_ID,
        clientId: FORGED_CLIENT_ID,
      }))

      expect(response.status).toBe(200)
      expectInvitedProfileMutation(USER_ID)
      expectCoachClientUpsert(COACH_ID, USER_ID)
      expect(mocks.profileUpdateEq).not.toHaveBeenCalledWith('id', FORGED_CLIENT_ID)
    })
  })

  describe('subscription mutation and coach resolution', () => {
    it('grants active invited access from an arbitrary supplied coachId without invitation proof', async () => {
      const response = await POST(request({ coachId: COACH_ID, autoAssign: false }))

      expect(response.status).toBe(200)
      expectInvitedProfileMutation()
      expectCoachClientUpsert(COACH_ID)
      expect(mocks.profileSelect).not.toHaveBeenCalled()
      expect(mocks.mutationOrder).toEqual(['profiles.update', 'coach_clients.upsert'])
    })

    it('accepts a syntactically invalid coachId and reaches the relationship upsert', async () => {
      const response = await POST(request({ coachId: 'not-a-uuid' }))

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        success: true,
        coachId: 'not-a-uuid',
        autoAssign: false,
      })
      expectInvitedProfileMutation()
      expectCoachClientUpsert('not-a-uuid')
    })

    it('uses the default coach and preserves the normal subscription fields when autoAssign is true', async () => {
      const response = await POST(request({ coachId: COACH_ID, autoAssign: true }))

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        success: true,
        coachId: DEFAULT_COACH_ID,
        autoAssign: true,
      })
      expect(mocks.defaultCoachEq).toHaveBeenCalledWith('email', 'default-coach@example.test')
      expect(mocks.profileUpdate).toHaveBeenCalledWith({ role: 'client' })
      expect(mocks.profileUpdateEq).toHaveBeenCalledWith('id', USER_ID)
      expectCoachClientUpsert(DEFAULT_COACH_ID, USER_ID, false)
    })

    it('uses the default coach when coachId is absent, but still grants invited access if autoAssign is false', async () => {
      const response = await POST(request({ autoAssign: false }))

      expect(response.status).toBe(200)
      expectInvitedProfileMutation()
      expectCoachClientUpsert(DEFAULT_COACH_ID, USER_ID, false)
      await expect(response.json()).resolves.toEqual({
        success: true,
        coachId: DEFAULT_COACH_ID,
        autoAssign: false,
      })
    })

    it('returns 400 without mutation when coachId is absent and no default coach is found', async () => {
      mocks.defaultCoachMaybeSingle.mockResolvedValue({ data: null, error: null })

      const response = await POST(request({}))

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: 'Aucun coach trouvé' })
      expect(mocks.profileUpdate).not.toHaveBeenCalled()
      expect(mocks.coachClientsUpsert).not.toHaveBeenCalled()
    })
  })

  describe('partial failures and configuration', () => {
    it('does not inspect a profile update error and continues with the relationship upsert', async () => {
      mocks.profileUpdateEq.mockImplementation(async () => {
        mocks.mutationOrder.push('profiles.update')
        return { error: { message: 'profile update failed' } }
      })

      const response = await POST(request({ coachId: COACH_ID }))

      expect(response.status).toBe(200)
      expectCoachClientUpsert(COACH_ID)
      expect(mocks.mutationOrder).toEqual(['profiles.update', 'coach_clients.upsert'])
    })

    it('returns 500 after leaving the profile mutation applied when coach_clients upsert fails', async () => {
      mocks.coachClientsUpsert.mockImplementation(async () => {
        mocks.mutationOrder.push('coach_clients.upsert')
        return { error: { message: 'relationship failed' } }
      })

      const response = await POST(request({ coachId: COACH_ID }))

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({ error: 'relationship failed' })
      expectInvitedProfileMutation()
      expect(mocks.mutationOrder).toEqual(['profiles.update', 'coach_clients.upsert'])
    })

    it('documents a nonexistent coach as an upsert failure after invited access was already attempted', async () => {
      mocks.coachClientsUpsert.mockResolvedValue({
        error: { message: 'insert or update on table "coach_clients" violates foreign key constraint' },
      })

      const response = await POST(request({ coachId: COACH_ID }))

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({
        error: 'insert or update on table "coach_clients" violates foreign key constraint',
      })
      expectInvitedProfileMutation()
    })

    it('returns 500 before creating the admin client when the service-role key is absent', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const response = await POST(request({ coachId: COACH_ID }))

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({ error: 'Server misconfigured' })
      expect(mocks.createClient).not.toHaveBeenCalled()
      expect(mocks.profileUpdate).not.toHaveBeenCalled()
      expect(mocks.coachClientsUpsert).not.toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })
})
