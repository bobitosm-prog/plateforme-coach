import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  serverClient: { from: vi.fn() },
  identity: vi.fn(),
  findProfile: vi.fn(),
  updateProfile: vi.fn(),
  insert: vi.fn(),
  checkAiQuota: vi.fn(),
  checkRateLimit: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn(async () => mocks.serverClient) }))
vi.mock('@/lib/repositories/identity', () => ({ createIdentityRepository: () => ({ getCurrent: mocks.identity }) }))
vi.mock('@/lib/repositories/profile', () => ({ createProfileRepository: () => ({ findById: mocks.findProfile, updateSafe: mocks.updateProfile }) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit, checkAiQuota: mocks.checkAiQuota }))

import { POST as syncLocale } from '../../app/api/user/sync-locale/route'
import { POST as updateLocale } from '../../app/api/user/locale/route'
import { POST as logError } from '../../app/api/log-error/route'
import { GET as aiQuota } from '../../app/api/ai-quota/route'

const routeRequest = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.identity.mockResolvedValue({ ok: true, kind: 'authenticated', data: { id: 'session-user', email: 'user@example.test' } })
  mocks.findProfile.mockResolvedValue({ ok: true, data: { preferred_locale: 'de' } })
  mocks.updateProfile.mockResolvedValue({ ok: true, data: { preferred_locale: 'fr' } })
  mocks.insert.mockResolvedValue({ error: null })
  mocks.serverClient.from.mockReturnValue({ insert: mocks.insert })
  mocks.checkRateLimit.mockReturnValue({ allowed: true })
  mocks.checkAiQuota.mockResolvedValue({ remaining: 4, limit: 5, resetIn: 3600 })
})

describe('migrated session routes', () => {
  it('reads locale through session identity and profile repository', async () => {
    const response = await syncLocale(routeRequest('/api/user/sync-locale', { method: 'POST' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, locale: 'de' })
    expect(mocks.findProfile).toHaveBeenCalledWith('session-user')
  })

  it('keeps absent and failed profile reads neutral and expurgated', async () => {
    mocks.findProfile.mockResolvedValueOnce({ ok: false, kind: 'not_found' })
    expect(await (await syncLocale(routeRequest('/api/user/sync-locale', { method: 'POST' }))).json()).toEqual({ success: true, locale: null })
    mocks.findProfile.mockResolvedValueOnce({ ok: false, kind: 'failure', error: { kind: 'forbidden', contextCode: '42501' } })
    expect(await (await syncLocale(routeRequest('/api/user/sync-locale', { method: 'POST' }))).json()).toEqual({ success: true, locale: null })
  })

  it('updates only the session profile through the safe repository mutation', async () => {
    const request = new Request('http://localhost/api/user/locale', { method: 'POST', body: JSON.stringify({ locale: 'fr' }) })
    const response = await updateLocale(request as never)
    expect(response.status).toBe(200)
    expect(mocks.updateProfile).toHaveBeenCalledWith('session-user', { preferred_locale: 'fr' })
  })

  it('preserves malformed locale JSON as a historical server error', async () => {
    const response = await updateLocale(new Request('http://localhost/api/user/locale', {
      method: 'POST', body: '{',
    }) as never)
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Server error' })
  })

  it('preserves authorization and hides repository failures', async () => {
    mocks.identity.mockResolvedValueOnce({ ok: false, kind: 'anonymous' })
    const anonymous = await updateLocale(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ locale: 'fr' }) }) as never)
    expect(anonymous.status).toBe(401)
    mocks.updateProfile.mockResolvedValueOnce({ ok: false, kind: 'failure', error: { kind: 'unexpected', contextCode: 'secret' } })
    const failed = await updateLocale(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ locale: 'en' }) }) as never)
    expect(failed.status).toBe(500)
    expect(await failed.json()).toEqual({ error: 'Failed to update locale' })
  })

  it('preserves the historical no-row locale update response', async () => {
    mocks.updateProfile.mockResolvedValueOnce({ ok: false, kind: 'not_found' })
    const response = await updateLocale(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ locale: 'de' }) }) as never)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, locale: 'de' })
  })

  it('derives optional log identity from the repository, never the body', async () => {
    const request = new Request('http://localhost/api/log-error', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ level: 'error', message: 'synthetic', user_id: 'forged' }) })
    expect((await logError(request as never)).status).toBe(200)
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'session-user', user_email: 'user@example.test' }))
  })

  it('rate-limits logs before parsing and preserves malformed JSON as 500', async () => {
    mocks.checkRateLimit.mockReturnValueOnce({ allowed: false })
    const limited = await logError(new Request('http://localhost/api/log-error', {
      method: 'POST', body: '{',
    }) as never)
    expect(limited.status).toBe(429)
    mocks.checkRateLimit.mockReturnValueOnce({ allowed: true })
    const malformed = await logError(new Request('http://localhost/api/log-error', {
      method: 'POST', body: '{',
    }) as never)
    expect(malformed.status).toBe(500)
  })

  it('checks AI quota for the repository session identity', async () => {
    const response = await aiQuota(new Request('http://localhost/api/ai-quota') as never)
    expect(response.status).toBe(200)
    expect(mocks.checkAiQuota).toHaveBeenCalledWith(mocks.serverClient, 'session-user')
  })
})
