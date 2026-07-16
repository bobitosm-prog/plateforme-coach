import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  deleteRows: vi.fn(),
  createAdmin: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: mocks.createAdmin,
}))

import { POST } from '../../app/api/coach/disconnect/route'

const request = (body?: string) => new Request('http://localhost/api/coach/disconnect', { method: 'POST', body })
const original = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-test-key'
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'session-client' } } })
  mocks.deleteRows.mockResolvedValue({ error: null })
  mocks.createAdmin.mockReturnValue({
    from: vi.fn(() => ({ delete: vi.fn(() => ({ eq: mocks.deleteRows })) })),
  })
})

afterAll(() => {
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: original.url, SUPABASE_SERVICE_ROLE_KEY: original.key })) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('coach disconnect route', () => {
  it('rejects bodies and anonymous callers before creating admin authority', async () => {
    expect((await POST(request('{}'))).status).toBe(400)
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } })
    expect((await POST(request())).status).toBe(401)
    expect(mocks.createAdmin).not.toHaveBeenCalled()
  })

  it('deletes only relationships owned by the session identity', async () => {
    expect((await POST(request())).status).toBe(200)
    expect(mocks.createAdmin).toHaveBeenCalledOnce()
    expect(mocks.deleteRows).toHaveBeenCalledWith('client_id', 'session-client')
  })

  it('preserves the closed failure response', async () => {
    mocks.deleteRows.mockResolvedValueOnce({ error: { code: 'unexpected' } })
    const response = await POST(request())
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ success: false })
  })
})
