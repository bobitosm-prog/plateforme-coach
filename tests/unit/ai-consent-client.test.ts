// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const dialog = vi.hoisted(() => ({ show: vi.fn() }))
vi.mock('@/lib/ai/consent-dialog', () => ({ showAiConsentDialog: dialog.show }))
import { aiFetch, AiConsentDeclinedError, clientSubjectAiFetch, setAiConsent } from '@/lib/ai/consent-client'
import { AI_SUBJECT_HEADER, AI_ACCOUNT_HEADER, AI_CONSENT_VERSION } from '@/lib/ai/consent-policy'
import { EMPTY_INITIAL_GENERATION_SNAPSHOT, runInitialGenerationAttempt } from '@/lib/initial-generation/engine'
let userId: string, granted: boolean, decided: boolean
let network: ReturnType<typeof vi.fn>
beforeEach(() => {
  userId = 'account-a'; granted = false; decided = false; dialog.show.mockReset()
  document.documentElement.lang = 'fr'
  network = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/ai-consent') {
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body))
        if (body.userId !== userId) return Response.json({}, { status: 409 })
        granted = body.granted
        decided = true
      }
      return Response.json({ userId, granted, decided, version: AI_CONSENT_VERSION })
    }
    return Response.json({ ok: true })
  })
  vi.stubGlobal('fetch', network)
})
afterEach(() => vi.unstubAllGlobals())
describe('first use, later, account changes and withdrawal', () => {
  it('never uploads the payload and records Later as a refusal, not permission', async () => {
    dialog.show.mockResolvedValue(false)
    await expect(aiFetch('/api/analyze-meal-photo', { method: 'POST', body: 'private-photo' })).rejects.toBeInstanceOf(AiConsentDeclinedError)
    expect(network.mock.calls.every(([url]) => url === '/api/ai-consent')).toBe(true)
    expect(granted).toBe(false)
    expect(decided).toBe(true)
  })
  it('does not reopen an automatic prompt after a recorded refusal', async () => {
    decided = true
    await expect(aiFetch('/api/generate-meal-plan', {}, userId, false)).rejects.toBeInstanceOf(AiConsentDeclinedError)
    expect(dialog.show).not.toHaveBeenCalled()
    expect(network).toHaveBeenCalledOnce()
  })
  it('shares one pending dialog and persists acceptance before sending requests', async () => {
    let answer!: (value: boolean) => void
    dialog.show.mockImplementation(() => new Promise(resolve => { answer = resolve }))
    const training = aiFetch('/api/generate-custom-program')
    const nutrition = aiFetch('/api/generate-meal-plan')
    await vi.waitFor(() => expect(dialog.show).toHaveBeenCalledOnce())
    expect(network.mock.calls.every(([url]) => url === '/api/ai-consent')).toBe(true)
    answer(true); await Promise.all([training, nutrition])
    const posts = network.mock.calls.filter(([, init]) => init?.method === 'POST')
    expect(posts).toHaveLength(1)
    for (const [, init] of network.mock.calls.filter(([url]) => url !== '/api/ai-consent')) {
      expect(new Headers(init?.headers).get(AI_ACCOUNT_HEADER)).toBe('account-a')
    }
  })
  it('cannot accept for a new account when switching while the dialog is open', async () => {
    dialog.show.mockImplementation(async () => { userId = 'account-b'; return true })
    await expect(aiFetch('/api/chat-ai')).rejects.toThrow('compte')
    expect(granted).toBe(false)
    expect(network.mock.calls.some(([url]) => url === '/api/chat-ai')).toBe(false)
  })
  it('does not use cached acceptance after withdrawal', async () => {
    granted = true
    await aiFetch('/api/chat-ai')
    await setAiConsent('account-a', false)
    dialog.show.mockResolvedValue(false)
    await expect(aiFetch('/api/chat-ai')).rejects.toBeInstanceOf(AiConsentDeclinedError)
    expect(network.mock.calls.filter(([url]) => url === '/api/chat-ai')).toHaveLength(1)
  })
  it('refuses stale data ownership and never grants a client consent', async () => {
    await expect(aiFetch('/api/chat-ai', {}, 'account-b')).rejects.toThrow('compte')
    network.mockImplementation(async (url) => url === '/api/ai-consent'
      ? Response.json({ userId, granted: true, decided: true, version: AI_CONSENT_VERSION })
      : Response.json({ code: 'ai_consent_required' }, { status: 403 }))
    await expect(clientSubjectAiFetch('/api/generate-program', {}, 'client-b')).rejects.toThrow('client')
    expect(dialog.show).not.toHaveBeenCalled()
    expect(network.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
  })
  it('does not upload when the permission store fails', async () => {
    network.mockResolvedValue(Response.json({}, { status: 503 }))
    await expect(aiFetch('/api/chat-ai')).rejects.toThrow()
    expect(dialog.show).not.toHaveBeenCalled()
    expect(network).toHaveBeenCalledOnce()
  })
  it('postpones both initial plans without repeating the question or treating refusal as an error', async () => {
    dialog.show.mockResolvedValue(false)
    const training = { read: async () => ({ kind: 'missing' as const }), generate: () => aiFetch('/api/generate-custom-program'), validate: () => true, persist: vi.fn(async () => true), canGenerate: true }
    const nutrition = { ...training, generate: vi.fn(() => aiFetch('/api/generate-meal-plan')) }
    const clearFlag = vi.fn(async () => true)
    const result = await runInitialGenerationAttempt({ snapshot: EMPTY_INITIAL_GENERATION_SNAPSHOT, domains: ['training', 'nutrition'], ports: { training, nutrition }, checkQuota: async () => 'available', clearFlag })
    expect(result.training).toEqual({ phase: 'missing', reason: 'consent_declined' })
    expect(result.nutrition).toEqual({ phase: 'missing', reason: 'consent_declined' })
    expect(nutrition.generate).not.toHaveBeenCalled(); expect(clearFlag).not.toHaveBeenCalled()
    expect(dialog.show).toHaveBeenCalledOnce()
  })
})

it('binds coach and client separately without requiring the coach personal consent', async () => {
  const response = await clientSubjectAiFetch('/api/generate-program', { method: 'POST' }, 'client-b', 'account-a')
  expect(response.ok).toBe(true)
  expect(dialog.show).not.toHaveBeenCalled()
  const headers = new Headers(network.mock.calls.at(-1)?.[1]?.headers)
  expect(headers.get(AI_ACCOUNT_HEADER)).toBe('account-a')
  expect(headers.get(AI_SUBJECT_HEADER)).toBe('client-b')
  await expect(clientSubjectAiFetch('/api/generate-program', {}, 'client-b', 'old-coach')).rejects.toThrow('compte')
})
