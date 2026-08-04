import { it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
  AdminAuthError: class extends Error {},
}))

const createMock = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { messages = { create: createMock } },
}))

import { POST } from '@/app/api/admin/seedance/prompt/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
})

function req(body: unknown) {
  return new Request('http://x/api/admin/seedance/prompt', {
    method: 'POST', body: JSON.stringify(body),
  })
}

it('rejects non-admin', async () => {
  vi.mocked(verifyAdmin).mockRejectedValueOnce(new Error('forbidden'))
  const res = await POST(req({ exerciseName: 'Squat' }))
  expect(res.status).toBe(401)
})

it('returns a Claude-generated prompt for an authed admin', async () => {
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  createMock.mockResolvedValueOnce({ content: [{ type: 'text', text: 'Démo fitness du Squat, plan large...' }] })
  const res = await POST(req({ exerciseName: 'Squat', muscleGroup: 'Jambes' }))
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.prompt).toContain('Squat')
  expect(createMock).toHaveBeenCalledOnce()
})

it('400 when exerciseName missing', async () => {
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  const res = await POST(req({}))
  expect(res.status).toBe(400)
})
