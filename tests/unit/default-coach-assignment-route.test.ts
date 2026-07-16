import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createAdmin: vi.fn(() => ({ marker: 'admin' })),
  assign: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: mocks.createAdmin }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}))
vi.mock('@/lib/coach-relations/default-assignment', () => ({ assignConfiguredDefaultCoach: mocks.assign }))

import { POST } from '../../app/api/coach/default-assignment/route'

const original = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  coach: process.env.DEFAULT_COACH_EMAIL,
}
const request = (body?: string) => new Request('http://localhost/api/coach/default-assignment', { method: 'POST', body })

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-test-key'
  process.env.DEFAULT_COACH_EMAIL = 'default@moovx.example.test'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'client-session-id' } } })
  mocks.assign.mockResolvedValue({ coachId: 'coach-server-id', assigned: true, isDefault: true })
})

afterAll(() => {
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: original.url, SUPABASE_SERVICE_ROLE_KEY: original.key, DEFAULT_COACH_EMAIL: original.coach })) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('default coach assignment route', () => {
  it('rejects anonymous and forged authority bodies', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect((await POST(request())).status).toBe(401)
    expect((await POST(request(JSON.stringify({ clientId: 'forged', coachId: 'forged' })))).status).toBe(400)
    expect(mocks.assign).not.toHaveBeenCalled()
  })

  it('uses session identity and server-only coach configuration', async () => {
    const response = await POST(request('{}'))
    expect(response.status).toBe(200)
    expect(mocks.assign).toHaveBeenCalledWith(expect.anything(), 'client-session-id', 'default@moovx.example.test')
    expect(mocks.createAdmin).toHaveBeenCalledOnce()
  })

  it('fails closed when configuration or assignment is unavailable', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect((await POST(request())).status).toBe(503)
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-test-key'
    mocks.assign.mockRejectedValueOnce(new Error('DEFAULT_COACH_INVALID'))
    expect((await POST(request())).status).toBe(503)
  })
})
