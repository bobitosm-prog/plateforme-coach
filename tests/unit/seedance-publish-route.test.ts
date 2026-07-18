import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))

// Chainable supabaseAdmin mock
const jobSingle = vi.fn()
const exercisesUpdateEq = vi.fn().mockResolvedValue({ error: null })
const jobsUpdateEq = vi.fn().mockResolvedValue({ error: null })
const uploadMock = vi.fn().mockResolvedValue({ error: null })
const getPublicUrlMock = vi.fn().mockReturnValue({ data: { publicUrl: 'https://bucket/squat/squat.mp4' } })

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'seedance_jobs') {
        return {
          select: () => ({ eq: () => ({ single: jobSingle }) }),
          update: () => ({ eq: jobsUpdateEq }),
        }
      }
      // exercises_db
      return { update: () => ({ eq: exercisesUpdateEq }) }
    },
    storage: { from: () => ({ upload: uploadMock, getPublicUrl: getPublicUrlMock }) },
  },
}))

import { POST } from '@/app/api/admin/seedance/publish/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, arrayBuffer: async () => new ArrayBuffer(8),
  }))
})
const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

it('rejects non-admin', async () => {
  ;(verifyAdmin as any).mockRejectedValueOnce(new Error('no'))
  expect((await POST(req({ jobId: 'j1' }))).status).toBe(401)
})

it('downloads remote video, uploads to bucket, updates exercise, returns url', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  jobSingle.mockResolvedValueOnce({
    data: { id: 'j1', exercise_id: 'ex1', exercise_name: 'Squat', status: 'completed', video_url_remote: 'https://cdn/x.mp4' },
    error: null,
  })
  const res = await POST(req({ jobId: 'j1' }))
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.publishedVideoUrl).toContain('https://bucket/squat/squat.mp4')
  expect(uploadMock).toHaveBeenCalledWith('squat/squat.mp4', expect.anything(), { contentType: 'video/mp4', upsert: true })
  expect(exercisesUpdateEq).toHaveBeenCalledWith('id', 'ex1')
})

it('409 when job not completed or has no remote url', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  jobSingle.mockResolvedValueOnce({ data: { id: 'j1', status: 'generating', video_url_remote: null }, error: null })
  expect((await POST(req({ jobId: 'j1' }))).status).toBe(409)
})
