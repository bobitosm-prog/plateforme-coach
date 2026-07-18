import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))

// Chainable supabaseAdmin mock
const {
  jobSingle, exercisesUpdateEq, jobsUpdateEq, uploadMock, getPublicUrlMock, capturedExUpdate,
} = vi.hoisted(() => ({
  jobSingle: vi.fn(),
  exercisesUpdateEq: vi.fn().mockResolvedValue({ error: null }),
  jobsUpdateEq: vi.fn().mockResolvedValue({ error: null }),
  uploadMock: vi.fn().mockResolvedValue({ error: null }),
  getPublicUrlMock: vi.fn().mockReturnValue({ data: { publicUrl: 'https://bucket/squat/squat.mp4' } }),
  capturedExUpdate: { value: null as any },
}))

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'seedance_jobs') {
        return {
          select: () => ({ eq: () => ({ single: jobSingle }) }),
          update: () => ({ eq: jobsUpdateEq }),
        }
      }
      // exercises_db — capture le payload d'update
      return { update: (payload: any) => { capturedExUpdate.value = payload; return { eq: exercisesUpdateEq } } }
    },
    storage: { from: () => ({ upload: uploadMock, getPublicUrl: getPublicUrlMock }) },
  },
}))

import { POST } from '@/app/api/admin/seedance/publish/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => '8' },
    arrayBuffer: async () => new ArrayBuffer(8),
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
    data: { id: 'j1', exercise_id: 'ex1', exercise_name: 'Squat', status: 'completed', video_url_remote: 'https://cdn/x.mp4', reference_image_url: null },
    error: null,
  })
  const res = await POST(req({ jobId: 'j1' }))
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.publishedVideoUrl).toContain('https://bucket/squat/squat.mp4')
  expect(uploadMock).toHaveBeenCalledWith('squat/squat.mp4', expect.anything(), { contentType: 'video/mp4', upsert: true })
  expect(exercisesUpdateEq).toHaveBeenCalledWith('id', 'ex1')
  // sans image de référence : pas de gif_url
  expect(capturedExUpdate.value).toEqual({ video_url: expect.stringContaining('https://bucket/squat/squat.mp4') })
})

it('also sets gif_url poster from the reference image (image→video job)', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  jobSingle.mockResolvedValueOnce({
    data: { id: 'j1', exercise_id: 'ex1', exercise_name: 'Squat', status: 'completed', video_url_remote: 'https://cdn/x.mp4', reference_image_url: 'https://bucket/squat/ref-1.jpg' },
    error: null,
  })
  const res = await POST(req({ jobId: 'j1' }))
  expect(res.status).toBe(200)
  // le poster est uploadé et gif_url est posé
  expect(uploadMock).toHaveBeenCalledWith('squat/squat.jpg', expect.anything(), { contentType: 'image/jpeg', upsert: true })
  expect(capturedExUpdate.value.video_url).toContain('https://bucket/squat/squat.mp4')
  expect(capturedExUpdate.value.gif_url).toContain('https://bucket/squat/squat.mp4')
})

it('409 when job not completed or has no remote url', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  jobSingle.mockResolvedValueOnce({ data: { id: 'j1', status: 'generating', video_url_remote: null }, error: null })
  expect((await POST(req({ jobId: 'j1' }))).status).toBe(409)
})
