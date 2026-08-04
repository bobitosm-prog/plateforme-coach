import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { uploadMock, createSignedUrlMock, removeMock, listMock, createClientMock } = vi.hoisted(() => {
  const upload = vi.fn()
  const createSignedUrl = vi.fn()
  const remove = vi.fn()
  const list = vi.fn()
  return {
    uploadMock: upload,
    createSignedUrlMock: createSignedUrl,
    removeMock: remove,
    listMock: list,
    createClientMock: vi.fn(() => ({
      storage: { from: () => ({ upload, createSignedUrl, remove, list }) },
    })),
  }
})

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }))

import {
  assertSeedanceProviderReferenceUrl,
  classifySeedanceReferenceUrl,
  purgeExpiredSeedanceReferences,
  uploadSeedanceReference,
} from '@/lib/seedance/reference-storage'

const STAGING_HOST = 'cycbnnojcymjnaqomlyj.supabase.co'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('SEEDANCE_REFERENCE_SUPABASE_URL', `https://${STAGING_HOST}`)
  vi.stubEnv('SEEDANCE_REFERENCE_SUPABASE_SERVICE_ROLE_KEY', 'synthetic-service-role')
  vi.stubEnv('SEEDANCE_REFERENCE_BUCKET', 'seedance-references')
  vi.stubEnv('SEEDANCE_REFERENCE_SIGNED_URL_TTL_SECONDS', '900')
  vi.stubEnv('SEEDANCE_REFERENCE_MAX_BYTES', '10485760')
  vi.stubEnv('SEEDANCE_REFERENCE_ALLOWED_HOST', STAGING_HOST)
  uploadMock.mockResolvedValue({ error: null })
  removeMock.mockResolvedValue({ error: null })
  createSignedUrlMock.mockImplementation(async (path: string) => ({
    data: { signedUrl: `https://${STAGING_HOST}/storage/v1/object/sign/seedance-references/${path}?token=synthetic` },
    error: null,
  }))
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    url,
  })))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Seedance reference staging storage', () => {
  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ])('uploads a valid %s with a server-generated name', async (mimeType, extension) => {
    const result = await uploadSeedanceReference({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType,
      correlationId: 'seedance-correlation',
    })

    expect(result.objectPath).toMatch(new RegExp(`^seedance-correlation/[0-9a-f-]{36}\\.${extension}$`))
    expect(uploadMock).toHaveBeenCalledWith(result.objectPath, expect.any(Uint8Array), {
      cacheControl: '0',
      contentType: mimeType,
      upsert: false,
    })
    expect(result.signedUrl).toContain(`https://${STAGING_HOST}/storage/v1/object/sign/seedance-references/`)
    expect(result.expiresAt).toBeTruthy()
  })

  it('rejects an invalid MIME type before upload', async () => {
    await expect(uploadSeedanceReference({
      bytes: new Uint8Array([1]),
      mimeType: 'image/gif',
      correlationId: 'seedance-correlation',
    })).rejects.toMatchObject({ code: 'MIME_NOT_ALLOWED' })
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('rejects an image larger than 10 MiB before upload', async () => {
    await expect(uploadSeedanceReference({
      bytes: new Uint8Array(10 * 1024 * 1024 + 1),
      mimeType: 'image/jpeg',
      correlationId: 'seedance-correlation',
    })).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' })
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('accepts only a signed URL on the staging allowlist for a real provider', () => {
    const value = `https://${STAGING_HOST}/storage/v1/object/sign/seedance-references/seedance-correlation/00000000-0000-4000-8000-000000000001.jpg?token=synthetic`
    expect(classifySeedanceReferenceUrl(value)).toBe('staging_https')
    expect(assertSeedanceProviderReferenceUrl(value)).toBe('staging_https')
  })

  it.each([
    'https://example.com/storage/v1/object/sign/seedance-references/path?token=x',
    'http://example.com/image.jpg',
    'data:image/png;base64,abc',
    'file:///tmp/image.jpg',
    'javascript:alert(1)',
    `https://user:password@${STAGING_HOST}/image.jpg`,
  ])('rejects a forbidden reference URL: %s', (value) => {
    expect(() => classifySeedanceReferenceUrl(value)).toThrow()
  })

  it('refuses a local URL for a real provider but allows it for an explicit mock', () => {
    const value = 'http://127.0.0.1:55321/image.jpg'
    expect(() => assertSeedanceProviderReferenceUrl(value)).toThrow()
    vi.stubEnv('SEEDANCE_PROVIDER_MODE', 'mock')
    expect(assertSeedanceProviderReferenceUrl(value)).toBe('local_test')
  })

  it('removes an uploaded object when signed URL verification fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 302,
      url: 'https://other.example.com/image.jpg',
    }))

    await expect(uploadSeedanceReference({
      bytes: new Uint8Array([1]),
      mimeType: 'image/jpeg',
      correlationId: 'seedance-correlation',
    })).rejects.toMatchObject({ code: 'REDIRECT_FORBIDDEN' })
    expect(removeMock).toHaveBeenCalledWith([expect.stringMatching(/^seedance-correlation\//)])
  })

  it('purges only references older than 24 hours', async () => {
    listMock
      .mockResolvedValueOnce({ data: [{ name: 'seedance-correlation' }], error: null })
      .mockResolvedValueOnce({
        data: [{ name: '00000000-0000-4000-8000-000000000001.jpg', created_at: '2026-08-01T00:00:00.000Z' }],
        error: null,
      })

    await expect(purgeExpiredSeedanceReferences(Date.parse('2026-08-03T00:00:01.000Z'))).resolves.toBe(1)
    expect(removeMock).toHaveBeenCalledWith([
      'seedance-correlation/00000000-0000-4000-8000-000000000001.jpg',
    ])
  })
})
