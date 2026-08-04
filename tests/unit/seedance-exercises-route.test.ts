import { it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))

const orderMock = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ is: () => ({ order: orderMock }) }) }),
  },
}))

import { GET } from '@/app/api/admin/seedance/exercises/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => vi.clearAllMocks())
const req = () => new Request('http://x/api/admin/seedance/exercises')

it('rejects non-admin', async () => {
  vi.mocked(verifyAdmin).mockRejectedValueOnce(new Error('no'))
  expect((await GET(req())).status).toBe(401)
})

it('returns exercises with null video_url', async () => {
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  orderMock.mockResolvedValueOnce({
    data: [{ id: 'ex1', name: 'Squat', muscle_group: 'Jambes', equipment: 'Barre', gif_url: 'https://img/s.jpg' }],
    error: null,
  })
  const res = await GET(req())
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.exercises).toHaveLength(1)
  expect(json.exercises[0].name).toBe('Squat')
})
