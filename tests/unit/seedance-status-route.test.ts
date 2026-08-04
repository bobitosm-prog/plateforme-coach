import { it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))
const { getTaskMock } = vi.hoisted(() => ({ getTaskMock: vi.fn() }))
vi.mock('@/lib/seedance/client', () => ({ getTask: getTaskMock }))

const { referencePathMock, removeReferenceMock } = vi.hoisted(() => ({
  referencePathMock: vi.fn(),
  removeReferenceMock: vi.fn(),
}))
vi.mock('@/lib/seedance/reference-storage', () => ({
  referenceObjectPathFromParams: referencePathMock,
  removeSeedanceReference: removeReferenceMock,
}))

const updateEq = vi.fn().mockResolvedValue({ error: null })
const maybeSingle = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({
      update: () => ({ eq: updateEq }),
      select: () => ({ eq: () => ({ maybeSingle }) }),
    }),
  },
}))

import { GET } from '@/app/api/admin/seedance/status/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => {
  vi.clearAllMocks()
  removeReferenceMock.mockResolvedValue(undefined)
})
const url = (taskId?: string) =>
  new Request(`http://x/api/admin/seedance/status${taskId ? `?taskId=${taskId}` : ''}`)

it('rejects non-admin', async () => {
  vi.mocked(verifyAdmin).mockRejectedValueOnce(new Error('no'))
  const res = await GET(url('task_1'))
  expect(res.status).toBe(401)
})

it('400 when taskId missing', async () => {
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  const res = await GET(url())
  expect(res.status).toBe(400)
})

it('returns status + videoUrl and updates the job on completed', async () => {
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  getTaskMock.mockResolvedValueOnce({ status: 'completed', videoUrl: 'https://v/a.mp4', expiresAt: null, failedReason: null })
  const res = await GET(url('task_1'))
  expect(await res.json()).toEqual({ status: 'completed', videoUrl: 'https://v/a.mp4' })
  expect(updateEq).toHaveBeenCalledWith('task_id', 'task_1')
})

it('cleans up the temporary reference after a terminal failure', async () => {
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  getTaskMock.mockResolvedValueOnce({ status: 'failed', videoUrl: null, expiresAt: null, failedReason: 'mocked' })
  maybeSingle.mockResolvedValueOnce({ data: { params: { seedance_reference_path: 'seedance-test/ref.jpg' } }, error: null })
  referencePathMock.mockReturnValueOnce('seedance-test/00000000-0000-4000-8000-000000000001.jpg')

  expect((await GET(url('task_failed'))).status).toBe(200)
  expect(removeReferenceMock).toHaveBeenCalledWith('seedance-test/00000000-0000-4000-8000-000000000001.jpg')
})
