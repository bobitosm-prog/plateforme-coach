import { it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))

const createMock = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: createMock } } }))

const { generateImageMock } = vi.hoisted(() => ({ generateImageMock: vi.fn() }))
vi.mock('@/lib/gemini/image', () => ({ generateImage: generateImageMock }))

const { referenceEnabledMock, uploadReferenceMock } = vi.hoisted(() => ({
  referenceEnabledMock: vi.fn(),
  uploadReferenceMock: vi.fn(),
}))
vi.mock('@/lib/seedance/reference-storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/seedance/reference-storage')>()
  return {
    ...actual,
    isSeedanceReferenceStorageEnabled: referenceEnabledMock,
    uploadSeedanceReference: uploadReferenceMock,
  }
})

const uploadMock = vi.fn().mockResolvedValue({ error: null })
const getPublicUrlMock = vi.fn().mockReturnValue({ data: { publicUrl: 'https://bucket/squat/ref-1.jpg' } })
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { storage: { from: () => ({ upload: uploadMock, getPublicUrl: getPublicUrlMock }) } },
}))

import { POST } from '@/app/api/admin/seedance/image/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('ANTHROPIC_API_KEY', 'synthetic-anthropic-key')
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:55321')
  vi.stubEnv('SEEDANCE_LOCAL_STORAGE_FALLBACK_ENABLED', 'false')
  referenceEnabledMock.mockReturnValue(false)
})
afterEach(() => vi.unstubAllEnvs())
const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

it('rejects non-admin', async () => {
  vi.mocked(verifyAdmin).mockRejectedValueOnce(new Error('no'))
  expect((await POST(req({ exerciseName: 'Squat' }))).status).toBe(401)
})

it('400 when exerciseName missing', async () => {
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  expect((await POST(req({}))).status).toBe(400)
})

it('builds prompt via Claude, generates image, uploads, returns url', async () => {
  vi.stubEnv('SEEDANCE_LOCAL_STORAGE_FALLBACK_ENABLED', 'true')
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
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
  vi.stubEnv('SEEDANCE_LOCAL_STORAGE_FALLBACK_ENABLED', 'true')
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  generateImageMock.mockResolvedValueOnce({ bytes: new Uint8Array([1]), mimeType: 'image/jpeg' })

  const res = await POST(req({ exerciseName: 'Squat', imagePrompt: 'my custom prompt' }))
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.imagePrompt).toBe('my custom prompt')
  expect(createMock).not.toHaveBeenCalled()
})

it('returns the staging signed URL without exposing the object path', async () => {
  referenceEnabledMock.mockReturnValue(true)
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a' })
  generateImageMock.mockResolvedValueOnce({ bytes: new Uint8Array([1]), mimeType: 'image/webp' })
  uploadReferenceMock.mockResolvedValueOnce({
    objectPath: 'seedance-correlation/00000000-0000-4000-8000-000000000001.webp',
    signedUrl: 'https://staging.example.com/signed?token=synthetic',
    expiresAt: '2026-08-04T12:15:00.000Z',
  })

  const res = await POST(req({ exerciseName: 'Squat', imagePrompt: 'custom' }))
  const json = await res.json()

  expect(res.status).toBe(200)
  expect(json).toEqual({
    imageUrl: 'https://staging.example.com/signed?token=synthetic',
    imagePrompt: 'custom',
    expiresAt: '2026-08-04T12:15:00.000Z',
  })
  expect(JSON.stringify(json)).not.toContain('seedance-correlation/')
  expect(uploadMock).not.toHaveBeenCalled()
})

it('fails closed in Production when dedicated reference storage is unavailable', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('VERCEL_ENV', 'production')
  vi.stubEnv('SEEDANCE_LOCAL_STORAGE_FALLBACK_ENABLED', 'true')
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a' })

  const res = await POST(req({ exerciseName: 'Squat', imagePrompt: 'custom' }))

  expect(res.status).toBe(503)
  expect(generateImageMock).not.toHaveBeenCalled()
  expect(uploadMock).not.toHaveBeenCalled()
})

it('refuses the local fallback without its explicit flag', async () => {
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a' })

  const res = await POST(req({ exerciseName: 'Squat', imagePrompt: 'custom' }))

  expect(res.status).toBe(503)
  expect(generateImageMock).not.toHaveBeenCalled()
  expect(uploadMock).not.toHaveBeenCalled()
})

it('refuses the explicit local fallback when Supabase is not local', async () => {
  vi.stubEnv('SEEDANCE_LOCAL_STORAGE_FALLBACK_ENABLED', 'true')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a' })

  const res = await POST(req({ exerciseName: 'Squat', imagePrompt: 'custom' }))

  expect(res.status).toBe(503)
  expect(generateImageMock).not.toHaveBeenCalled()
  expect(uploadMock).not.toHaveBeenCalled()
})
