import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))
const { getTaskMock } = vi.hoisted(() => ({ getTaskMock: vi.fn() }))
vi.mock('@/lib/seedance/client', () => ({ getTask: getTaskMock }))

const updateEq = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: () => ({ update: () => ({ eq: updateEq }) }) },
}))

import { GET } from '@/app/api/admin/seedance/status/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => vi.clearAllMocks())
const url = (taskId?: string) =>
  new Request(`http://x/api/admin/seedance/status${taskId ? `?taskId=${taskId}` : ''}`)

it('rejects non-admin', async () => {
  ;(verifyAdmin as any).mockRejectedValueOnce(new Error('no'))
  const res = await GET(url('task_1'))
  expect(res.status).toBe(401)
})

it('400 when taskId missing', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  const res = await GET(url())
  expect(res.status).toBe(400)
})

it('returns status + videoUrl and updates the job on completed', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  getTaskMock.mockResolvedValueOnce({ status: 'completed', videoUrl: 'https://v/a.mp4', expiresAt: null, failedReason: null })
  const res = await GET(url('task_1'))
  expect(await res.json()).toEqual({ status: 'completed', videoUrl: 'https://v/a.mp4' })
  expect(updateEq).toHaveBeenCalledWith('task_id', 'task_1')
})
