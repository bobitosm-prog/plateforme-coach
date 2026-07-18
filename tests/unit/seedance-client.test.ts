import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

import { createTask, getTask } from '@/lib/seedance/client'

const OLD_ENV = process.env

beforeEach(() => {
  process.env = { ...OLD_ENV, SEEDANCE_API_KEY: 'sk_test_abc', SEEDANCE_BASE_URL: 'https://api.seedance2.ai' }
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

  it('throws when the API responds non-OK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ error: 'bad key' }),
    }))
    await expect(createTask('seedance-2-0', {
      prompt: 'x', generation_type: 'text-to-video',
      duration: 5, aspect_ratio: '9:16', resolution: '1080p',
    })).rejects.toThrow('Seedance createTask failed (401)')
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
