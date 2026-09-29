// @vitest-environment jsdom
import { webcrypto, createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { signInWithApple } from '@/lib/auth/apple-sign-in'

const postMessage = vi.fn()
const oauth = vi.fn()
const token = vi.fn()
const update = vi.fn()
const user = { id: 'synthetic-user', user_metadata: {} }
const client = { auth: { signInWithOAuth: oauth, signInWithIdToken: token, updateUser: update } } as unknown as SupabaseClient
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('crypto', webcrypto)
  Object.defineProperty(window, 'webkit', { configurable: true, value: { messageHandlers: { moovxAppleAuth: { postMessage } } } })
  postMessage.mockResolvedValue({ status: 'success', identityToken: 'synthetic-token' })
  token.mockResolvedValue({ data: { user, session: {} }, error: null })
  oauth.mockResolvedValue({ data: {}, error: null })
  update.mockResolvedValue({ error: null })
})
afterEach(() => { vi.unstubAllGlobals(); Reflect.deleteProperty(window, 'webkit') })

describe('Apple sign in in browser and native WebKit', () => {
  it('binds the native token to a random nonce and establishes the session through the browser client', async () => {
    expect(await signInWithApple(client, '/auth/callback')).toEqual({ kind: 'signed-in', user })
    const credentials = token.mock.calls[0][0]
    expect(credentials).toMatchObject({ provider: 'apple', token: 'synthetic-token' })
    expect(credentials.nonce).toMatch(/^[0-9a-f]{64}$/)
    expect(postMessage).toHaveBeenCalledWith({ nonce: createHash('sha256').update(credentials.nonce).digest('hex') })
    expect(oauth).not.toHaveBeenCalled()
    await signInWithApple(client, '/auth/callback')
    expect(token.mock.calls[1][0].nonce).not.toBe(credentials.nonce)
  })
  it('does not exchange a token or start OAuth after cancellation', async () => {
    postMessage.mockResolvedValue({ status: 'cancelled' })
    expect(await signInWithApple(client, '/auth/callback')).toEqual({ kind: 'cancelled' })
    expect(token).not.toHaveBeenCalled()
    expect(oauth).not.toHaveBeenCalled()
  })
  it.each([null, {}, { status: 'success' }, { status: 'success', identityToken: '' }])('rejects malformed native replies %#', async reply => {
    postMessage.mockResolvedValue(reply)
    await expect(signInWithApple(client, '/auth/callback')).rejects.toThrow('apple_sign_in_failed')
    expect(token).not.toHaveBeenCalled()
  })
  it('does not fall back to external navigation when the native bridge rejects', async () => {
    postMessage.mockRejectedValue(new Error('apple_sign_in_busy'))
    await expect(signInWithApple(client, '/auth/callback')).rejects.toThrow()
    expect(oauth).not.toHaveBeenCalled()
  })
  it('fails without publishing provider details when token validation fails', async () => {
    token.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'synthetic-private-provider-detail' } })
    await expect(signInWithApple(client, '/auth/callback')).rejects.toThrow('apple_sign_in_failed')
    expect(update).not.toHaveBeenCalled()
  })
  it('captures a first-authorization name but never overwrites an existing name', async () => {
    postMessage.mockResolvedValue({ status: 'success', identityToken: 'synthetic-token', fullName: ' Test Person ' })
    await signInWithApple(client, '/auth/callback')
    expect(update).toHaveBeenCalledWith({ data: { full_name: 'Test Person' } })
    update.mockClear()
    token.mockResolvedValue({ data: { user: { ...user, user_metadata: { full_name: 'Existing' } }, session: {} }, error: null })
    await signInWithApple(client, '/auth/callback')
    expect(update).not.toHaveBeenCalled()
  })
  it('preserves the web OAuth callback when no native bridge exists', async () => {
    Reflect.deleteProperty(window, 'webkit')
    expect(await signInWithApple(client, 'https://moovx.invalid/auth/callback')).toEqual({ kind: 'redirect' })
    expect(oauth).toHaveBeenCalledWith({ provider: 'apple', options: { redirectTo: 'https://moovx.invalid/auth/callback' } })
    expect(token).not.toHaveBeenCalled()
  })
})
