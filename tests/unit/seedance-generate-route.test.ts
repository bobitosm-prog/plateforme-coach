import { it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/auth', () => ({
  verifyAdmin: vi.fn(),
  handleAdminAuthError: () => new Response(JSON.stringify({ error: 'unauth' }), { status: 401 }),
}))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => ({ allowed: true }) }))
const { createTaskMock, getSeedanceProviderFailureMock } = vi.hoisted(() => ({
  createTaskMock: vi.fn(),
  getSeedanceProviderFailureMock: vi.fn(),
}))
vi.mock('@/lib/seedance/client', () => ({
  createTask: createTaskMock,
  getSeedanceProviderFailure: getSeedanceProviderFailureMock,
}))

const { classifyReferenceMock, objectPathMock, removeReferenceMock } = vi.hoisted(() => ({
  classifyReferenceMock: vi.fn(),
  objectPathMock: vi.fn(),
  removeReferenceMock: vi.fn(),
}))
vi.mock('@/lib/seedance/reference-storage', () => ({
  classifySeedanceReferenceUrl: classifyReferenceMock,
  objectPathFromSignedReferenceUrl: objectPathMock,
  removeSeedanceReference: removeReferenceMock,
}))

const insertSingle = vi.fn()
const insertMock = vi.fn((payload: Record<string, unknown>) => {
  void payload
  return { select: () => ({ single: insertSingle }) }
})
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({ insert: insertMock }),
  },
}))

import { POST } from '@/app/api/admin/seedance/generate/route'
import { verifyAdmin } from '@/lib/admin/auth'

beforeEach(() => {
  vi.clearAllMocks()
  classifyReferenceMock.mockImplementation((value: string) => value.startsWith('http://') ? 'local_test' : 'production_https')
  removeReferenceMock.mockResolvedValue(undefined)
})
afterEach(() => vi.unstubAllEnvs())

function req(body: unknown) {
  return new Request('http://x', {
    method: 'POST',
    headers: { 'x-request-id': 'seedance-test-correlation' },
    body: JSON.stringify(body),
  })
}
const validBody = {
  exerciseName: 'Squat', prompt: 'demo', model: 'seedance-2-0',
  generationType: 'text-to-video',
  params: { duration: 5, aspectRatio: '9:16', resolution: '1080p', seed: -1 },
}

it('rejects non-admin', async () => {
  vi.mocked(verifyAdmin).mockRejectedValueOnce(new Error('no'))
  const res = await POST(req(validBody))
  expect(res.status).toBe(401)
})

it('creates a Seedance task, inserts a job, returns ids', async () => {
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
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

it('accepts a remote HTTPS reference image URL', async () => {
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  createTaskMock.mockResolvedValueOnce({ taskId: 'task_9', credits: 40 })
  insertSingle.mockResolvedValueOnce({ data: { id: 'job_1' }, error: null })
  await POST(req({ ...validBody, generationType: 'image-to-video', referenceImageUrl: 'https://img/a.jpg' }))
  const [, input] = createTaskMock.mock.calls[0]
  expect(input.image_urls).toEqual(['https://img/a.jpg'])
})

it.each([
  'http://127.0.0.1:55321/storage/v1/object/public/exercise-videos/ref.jpg',
  'http://localhost:55321/storage/v1/object/public/exercise-videos/ref.jpg',
])('accepts a local HTTP reference image URL in development: %s', async (referenceImageUrl) => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  createTaskMock.mockResolvedValueOnce({ taskId: 'task_9', credits: 40 })
  insertSingle.mockResolvedValueOnce({ data: { id: 'job_1' }, error: null })

  const res = await POST(req({ ...validBody, generationType: 'image-to-video', referenceImageUrl }))

  expect(res.status).toBe(200)
  expect(createTaskMock.mock.calls[0][1].image_urls).toEqual([referenceImageUrl])
})

it.each([
  ['remote HTTP URL', 'development', 'http://media.example.com/ref.jpg'],
  ['local HTTP URL in production', 'production', 'http://127.0.0.1:55321/ref.jpg'],
  ['invalid URL', 'development', 'not-a-url'],
])('rejects a %s', async (_case, nodeEnv, referenceImageUrl) => {
  vi.stubEnv('NODE_ENV', nodeEnv)
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })

  const res = await POST(req({ ...validBody, generationType: 'image-to-video', referenceImageUrl }))

  expect(res.status).toBe(400)
  expect(createTaskMock).not.toHaveBeenCalled()
})

it('logs only normalized provider failure fields and keeps the public response generic', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  createTaskMock.mockRejectedValueOnce(new Error('secret-key private prompt http://127.0.0.1:55321/full/path'))
  getSeedanceProviderFailureMock.mockReturnValueOnce({
    status: 422,
    providerErrorType: 'invalid_request_error',
    providerErrorCode: 'image_unreachable',
  })
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const referenceImageUrl = 'http://127.0.0.1:55321/storage/v1/object/public/exercise-videos/private-ref.jpg'

  const res = await POST(req({
    ...validBody,
    prompt: 'private prompt',
    generationType: 'image-to-video',
    referenceImageUrl,
  }))

  expect(res.status).toBe(502)
  expect(await res.json()).toEqual({ error: 'Échec de la création de la tâche Seedance' })
  const serialized = String(errorLog.mock.calls[0][0])
  expect(JSON.parse(serialized)).toEqual({
    event: 'SEEDANCE_PROVIDER_FAILURE',
    status: 422,
    providerErrorType: 'invalid_request_error',
    providerErrorCode: 'image_unreachable',
    requestedModel: 'seedance-2-0',
    taskOperation: 'createTask',
    correlationId: 'seedance-test-correlation',
    referenceImageScheme: 'http',
    referenceImageHostClass: 'local',
  })
  expect(serialized).not.toContain('secret-key')
  expect(serialized).not.toContain('private prompt')
  expect(serialized).not.toContain(referenceImageUrl)
  expect(serialized).not.toContain('/storage/')
})

it('cleans up a staging reference after a mocked createTask failure without logging its URL', async () => {
  const referenceImageUrl = 'https://cycbnnojcymjnaqomlyj.supabase.co/storage/v1/object/sign/seedance-references/seedance-test/00000000-0000-4000-8000-000000000001.jpg?token=synthetic'
  const objectPath = 'seedance-test/00000000-0000-4000-8000-000000000001.jpg'
  classifyReferenceMock.mockReturnValueOnce('staging_https')
  objectPathMock.mockReturnValueOnce(objectPath)
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  createTaskMock.mockRejectedValueOnce(new Error('mocked provider failure'))
  getSeedanceProviderFailureMock.mockReturnValueOnce({ status: 422, providerErrorType: 'invalid_request_error' })
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const res = await POST(req({ ...validBody, generationType: 'image-to-video', referenceImageUrl }))

  expect(res.status).toBe(502)
  expect(removeReferenceMock).toHaveBeenCalledWith(objectPath)
  expect(String(errorLog.mock.calls[0][0])).not.toContain(referenceImageUrl)
  expect(insertMock).not.toHaveBeenCalled()
})

it('persists only the staging object path, never the signed URL', async () => {
  const referenceImageUrl = 'https://cycbnnojcymjnaqomlyj.supabase.co/storage/v1/object/sign/seedance-references/seedance-test/00000000-0000-4000-8000-000000000001.jpg?token=synthetic'
  const objectPath = 'seedance-test/00000000-0000-4000-8000-000000000001.jpg'
  classifyReferenceMock.mockReturnValueOnce('staging_https')
  objectPathMock.mockReturnValueOnce(objectPath)
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  createTaskMock.mockResolvedValueOnce({ taskId: 'task_9', credits: 40 })
  insertSingle.mockResolvedValueOnce({ data: { id: 'job_1' }, error: null })

  expect((await POST(req({ ...validBody, generationType: 'image-to-video', referenceImageUrl }))).status).toBe(200)
  const persisted = insertMock.mock.calls[0]?.[0]
  expect(persisted?.reference_image_url).toBeNull()
  const params = persisted?.params as Record<string, unknown>
  expect(params.seedance_reference_path).toBe(objectPath)
  expect(params.image_urls).toBeUndefined()
  expect(JSON.stringify(persisted)).not.toContain(referenceImageUrl)
})

it('400 on missing prompt', async () => {
  vi.mocked(verifyAdmin).mockResolvedValueOnce({ userId: 'u1', email: 'a@b.c' })
  const res = await POST(req({ ...validBody, prompt: '' }))
  expect(res.status).toBe(400)
})
