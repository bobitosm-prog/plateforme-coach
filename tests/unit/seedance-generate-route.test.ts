import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))
const { createTaskMock } = vi.hoisted(() => ({ createTaskMock: vi.fn() }))
vi.mock('@/lib/seedance/client', () => ({ createTask: createTaskMock }))

const insertSingle = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({ insert: () => ({ select: () => ({ single: insertSingle }) }) }),
  },
}))

import { POST } from '@/app/api/admin/seedance/generate/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => vi.clearAllMocks())

function req(body: unknown) {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}
const validBody = {
  exerciseName: 'Squat', prompt: 'demo', model: 'seedance-2-0',
  generationType: 'text-to-video',
  params: { duration: 5, aspectRatio: '9:16', resolution: '1080p', seed: -1 },
}

it('rejects non-admin', async () => {
  ;(verifyAdmin as any).mockRejectedValueOnce(new Error('no'))
  const res = await POST(req(validBody))
  expect(res.status).toBe(401)
})

it('creates a Seedance task, inserts a job, returns ids', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  createTaskMock.mockResolvedValueOnce({ taskId: 'task_9', credits: 40 })
  insertSingle.mockResolvedValueOnce({ data: { id: 'job_1' }, error: null })

  const res = await POST(req(validBody))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ jobId: 'job_1', taskId: 'task_9' })

  const [model, input] = createTaskMock.mock.calls[0]
  expect(model).toBe('seedance-2-0')
  expect(input.generation_type).toBe('text-to-video')
  expect(input.aspect_ratio).toBe('9:16')
})

it('passes image_urls for image-to-video', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  createTaskMock.mockResolvedValueOnce({ taskId: 'task_9', credits: 40 })
  insertSingle.mockResolvedValueOnce({ data: { id: 'job_1' }, error: null })
  await POST(req({ ...validBody, generationType: 'image-to-video', referenceImageUrl: 'https://img/a.jpg' }))
  const [, input] = createTaskMock.mock.calls[0]
  expect(input.image_urls).toEqual(['https://img/a.jpg'])
})

it('400 on missing prompt', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  const res = await POST(req({ ...validBody, prompt: '' }))
  expect(res.status).toBe(400)
})
