import { it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

import { generateImage } from '@/lib/gemini/image'

const OLD_ENV = process.env

beforeEach(() => { process.env = { ...OLD_ENV, GEMINI_API_KEY: 'gk_test' } })
afterEach(() => { process.env = OLD_ENV; vi.restoreAllMocks() })

it('POSTs to the Gemini image model and returns decoded bytes + mime', async () => {
  const b64 = Buffer.from('hello-image').toString('base64')
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { data: b64, mimeType: 'image/jpeg' } }] } }] }),
  })
  vi.stubGlobal('fetch', fetchMock)

  const res = await generateImage('a cinematic athlete')
  expect(Buffer.from(res.bytes).toString()).toBe('hello-image')
  expect(res.mimeType).toBe('image/jpeg')
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toContain('gemini-3.1-flash-image-preview:generateContent')
  expect(init.headers['x-goog-api-key']).toBe('gk_test')
  expect(JSON.parse(init.body).generationConfig.responseModalities).toEqual(['IMAGE'])
})

it('throws when the API responds non-OK', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false, status: 400, json: async () => ({ error: { message: 'bad prompt' } }),
  }))
  await expect(generateImage('x')).rejects.toThrow('Gemini generateImage failed (400)')
})

it('throws when no image part is returned', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'nope' }] } }] }),
  }))
  await expect(generateImage('x')).rejects.toThrow('aucune image')
})

it('throws when GEMINI_API_KEY is missing', async () => {
  delete process.env.GEMINI_API_KEY
  await expect(generateImage('x')).rejects.toThrow('GEMINI_API_KEY is not configured')
})
