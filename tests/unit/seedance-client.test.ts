import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

import { createTask, getSeedanceProviderFailure, getTask } from '@/lib/seedance/client'

const OLD_ENV = process.env

beforeEach(() => {
  process.env = {
    ...OLD_ENV,
    SEEDANCE_API_KEY: 'sk_test_abc',
    SEEDANCE_BASE_URL: 'https://api.seedance2.ai',
    SEEDANCE_PROVIDER_MODE: 'mock',
  }
})
afterEach(() => {
  process.env = OLD_ENV
  vi.restoreAllMocks()
})

describe('createTask', () => {
  it('POSTs to /v1/videos/generations with Bearer auth and returns taskId + credits', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ taskId: 'task_123', credits: 40 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await createTask('seedance-2-0', {
      prompt: 'demo', generation_type: 'text-to-video',
      duration: 5, aspect_ratio: '9:16', resolution: '1080p', seed: -1,
    })

    expect(res).toEqual({ taskId: 'task_123', credits: 40 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.seedance2.ai/v1/videos/generations')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer sk_test_abc')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('seedance-2-0')
    expect(body.input.prompt).toBe('demo')
  })

  it.each([
    ['authentication failure', 401, { error: { type: 'authentication_error', code: 'invalid_api_key', message: 'sensitive detail' } }, 'authentication_error', 'invalid_api_key'],
    ['invalid model', 400, { error: { type: 'invalid_request_error', code: 'model_not_found', message: 'sensitive detail' } }, 'invalid_request_error', 'model_not_found'],
    ['inaccessible image', 422, { error: { type: 'invalid_request_error', code: 'image_unreachable', message: 'http://127.0.0.1:55321/private/path' } }, 'invalid_request_error', 'image_unreachable'],
    ['invalid payload', 400, { type: 'validation_error', code: 'invalid_payload', message: 'prompt=sensitive' }, 'validation_error', 'invalid_payload'],
  ])('normalizes %s without retaining provider messages', async (_case, status, body, providerErrorType, providerErrorCode) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status,
      text: async () => JSON.stringify(body),
    }))

    const error = await createTask('seedance-2-0', {
      prompt: 'private prompt', generation_type: 'image-to-video', image_urls: ['http://127.0.0.1:55321/private/path'],
      duration: 5, aspect_ratio: '9:16', resolution: '1080p',
    }).catch((caught: unknown) => caught)

    expect(getSeedanceProviderFailure(error)).toEqual({ status, providerErrorType, providerErrorCode })
    expect(String(error)).not.toContain('sensitive detail')
    expect(String(error)).not.toContain('private prompt')
    expect(String(error)).not.toContain('127.0.0.1')
  })

  it('normalizes a network failure without retaining its message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect failed with secret URL')))

    const error = await createTask('seedance-2-0', {
      prompt: 'private prompt', generation_type: 'text-to-video',
      duration: 5, aspect_ratio: '9:16', resolution: '1080p',
    }).catch((caught: unknown) => caught)

    expect(getSeedanceProviderFailure(error)).toEqual({
      status: null,
      providerErrorType: 'network_error',
      providerErrorCode: 'request_failed',
    })
    expect(String(error)).not.toContain('secret URL')
    expect(String(error)).not.toContain('private prompt')
  })

  it('throws when SEEDANCE_API_KEY is missing', async () => {
    delete process.env.SEEDANCE_API_KEY
    await expect(createTask('seedance-2-0', {
      prompt: 'x', generation_type: 'text-to-video',
      duration: 5, aspect_ratio: '9:16', resolution: '1080p',
    })).rejects.toThrow('SEEDANCE_API_KEY is not configured')
  })
})

describe('getTask', () => {
  it('maps a completed task to videoUrl + expiresAt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'completed',
        data: { results: ['https://cdn.seedance2.ai/v/abc.mp4'], video_expires_at: '2026-07-19T00:00:00Z' },
      }),
    }))
    const res = await getTask('task_123')
    expect(res).toEqual({
      status: 'completed',
      videoUrl: 'https://cdn.seedance2.ai/v/abc.mp4',
      expiresAt: '2026-07-19T00:00:00Z',
      failedReason: null,
    })
  })

  it('maps a failed task to failedReason with null videoUrl', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'failed', failed_reason: 'content policy' }),
    }))
    const res = await getTask('task_123')
    expect(res).toEqual({ status: 'failed', videoUrl: null, expiresAt: null, failedReason: 'content policy' })
  })

  it('maps an in-progress task to null videoUrl', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ status: 'generating' }),
    }))
    const res = await getTask('task_123')
    expect(res.status).toBe('generating')
    expect(res.videoUrl).toBeNull()
  })
})
