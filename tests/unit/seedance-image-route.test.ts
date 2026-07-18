import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))

const createMock = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: createMock } } }))

const { generateImageMock } = vi.hoisted(() => ({ generateImageMock: vi.fn() }))
vi.mock('@/lib/gemini/image', () => ({ generateImage: generateImageMock }))

const uploadMock = vi.fn().mockResolvedValue({ error: null })
const getPublicUrlMock = vi.fn().mockReturnValue({ data: { publicUrl: 'https://bucket/squat/ref-1.jpg' } })
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { storage: { from: () => ({ upload: uploadMock, getPublicUrl: getPublicUrlMock }) } },
}))

import { POST } from '@/app/api/admin/seedance/image/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
})
const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

it('rejects non-admin', async () => {
  ;(verifyAdmin as any).mockRejectedValueOnce(new Error('no'))
  expect((await POST(req({ exerciseName: 'Squat' }))).status).toBe(401)
})

it('400 when exerciseName missing', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  expect((await POST(req({}))).status).toBe(400)
})

it('builds prompt via Claude, generates image, uploads, returns url', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  createMock.mockResolvedValueOnce({ content: [{ type: 'text', text: 'A man seated at a lat pulldown machine' }] })
  generateImageMock.mockResolvedValueOnce({ bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/jpeg' })

  const res = await POST(req({ exerciseName: 'Tirage', muscleGroup: 'Dos' }))
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.imageUrl).toBe('https://bucket/squat/ref-1.jpg')
  expect(json.imagePrompt).toContain('lat pulldown')
  // le style figé est bien appliqué
  expect(json.imagePrompt).toContain('cinematic')
  expect(uploadMock).toHaveBeenCalled()
})

it('uses a custom imagePrompt without calling Claude', async () => {
  ;(verifyAdmin as any).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  generateImageMock.mockResolvedValueOnce({ bytes: new Uint8Array([1]), mimeType: 'image/jpeg' })

  const res = await POST(req({ exerciseName: 'Squat', imagePrompt: 'my custom prompt' }))
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.imagePrompt).toBe('my custom prompt')
  expect(createMock).not.toHaveBeenCalled()
})
