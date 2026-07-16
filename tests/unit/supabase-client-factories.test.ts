import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/supabase/types'

const mocks = vi.hoisted(() => ({
  browser: vi.fn((url: string, key: string) => ({ kind: 'browser', url, key })),
  server: vi.fn((url: string, key: string, options: { cookies: { getAll(): unknown; setAll(values: unknown[]): void } }) => ({ kind: 'server', url, key, options, auth: { getUser: vi.fn() } })),
  admin: vi.fn((url: string, key: string, options: unknown) => ({ kind: 'admin', url, key, options })),
  cookies: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@supabase/ssr', () => ({ createBrowserClient: mocks.browser, createServerClient: mocks.server }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.admin }))
vi.mock('next/headers', () => ({ cookies: mocks.cookies }))

const original = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-fixture'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-fixture'
})

afterEach(() => {
  for (const [name, value] of [
    ['NEXT_PUBLIC_SUPABASE_URL', original.url], ['NEXT_PUBLIC_SUPABASE_ANON_KEY', original.anon], ['SUPABASE_SERVICE_ROLE_KEY', original.service],
  ] as const) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

describe('Supabase client factories', () => {
  it('creates one typed browser singleton from public configuration only', async () => {
    const browserModule = await import('../../lib/supabase/browser')
    const first = browserModule.getSupabaseBrowserClient()
    const second = browserModule.getSupabaseBrowserClient()
    expect(first).toBe(second)
    expect(mocks.browser).toHaveBeenCalledTimes(1)
    expect(mocks.browser).toHaveBeenCalledWith('https://project.supabase.test', 'public-anon-fixture')
    expect(mocks.browser).not.toHaveBeenCalledWith(expect.anything(), 'server-only-fixture')
    expectTypeOf(first).toEqualTypeOf<SupabaseClient<Database>>()
  })

  it('fails browser creation without exposing configuration values', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const { createSupabaseBrowserClient } = await import('../../lib/supabase/browser')
    expect(() => createSupabaseBrowserClient()).toThrow('Supabase browser configuration is incomplete')
    expect(() => createSupabaseBrowserClient()).not.toThrow(/server-only-fixture/)
  })

  it('creates distinct session clients and wires cookie reads and writes', async () => {
    const store = { getAll: vi.fn(() => [{ name: 'session', value: 'synthetic' }]), set: vi.fn() }
    const { createSupabaseServerClient } = await import('../../lib/supabase/server')
    const first = await createSupabaseServerClient(store)
    const second = await createSupabaseServerClient(store)
    expect(first).not.toBe(second)
    expect(mocks.server).toHaveBeenCalledTimes(2)
    const cookieContract = mocks.server.mock.calls[0][2].cookies
    expect(cookieContract.getAll()).toEqual([{ name: 'session', value: 'synthetic' }])
    cookieContract.setAll([{ name: 'refreshed', value: 'value', options: { path: '/' } }])
    expect(store.set).toHaveBeenCalledWith('refreshed', 'value', { path: '/' })
    expect(mocks.server.mock.calls[0][1]).toBe('public-anon-fixture')
    expectTypeOf(first).toEqualTypeOf<SupabaseClient<Database>>()
  })

  it('tolerates cookie writes forbidden in a Server Component', async () => {
    const store = { getAll: () => [], set: vi.fn(() => { throw new Error('read only') }) }
    const { createSupabaseServerClient } = await import('../../lib/supabase/server')
    await createSupabaseServerClient(store)
    expect(() => mocks.server.mock.calls[0][2].cookies.setAll([{ name: 'x', value: 'y', options: {} }])).not.toThrow()
  })

  it('creates a typed admin client with safe auth options and no cookies', async () => {
    const { createSupabaseAdminClient } = await import('../../lib/supabase/admin')
    const client = createSupabaseAdminClient()
    expect(mocks.admin).toHaveBeenLastCalledWith('https://project.supabase.test', 'server-only-fixture', {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
    expect(mocks.cookies).not.toHaveBeenCalled()
    expectTypeOf(client).toEqualTypeOf<SupabaseClient<Database>>()
  })

  it.each(['url', 'service'] as const)('fails admin creation when %s is missing without leaking secrets', async (missing) => {
    if (missing === 'url') delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else delete process.env.SUPABASE_SERVICE_ROLE_KEY
    await expect(import('../../lib/supabase/admin')).rejects.toThrow(/Supabase server configuration is incomplete/)
    try { await import('../../lib/supabase/admin') } catch (error) {
      expect(String(error)).not.toContain('server-only-fixture')
      expect(String(error)).not.toContain('public-anon-fixture')
    }
  })

  it('keeps browser graph free of server-only and service-role imports', () => {
    const browser = readFileSync(new URL('../../lib/supabase/browser.ts', import.meta.url), 'utf8')
    const client = readFileSync(new URL('../../lib/supabase/client.ts', import.meta.url), 'utf8')
    expect(browser + client).not.toMatch(/server-only|SUPABASE_SERVICE_ROLE_KEY|next\/headers|\.\/admin|supabase\/admin/)
  })

  it('keeps admin and environment modules explicitly server-only', () => {
    for (const file of ['../../lib/supabase/admin.ts', '../../lib/supabase/env.ts']) {
      expect(readFileSync(new URL(file, import.meta.url), 'utf8')).toMatch(/^import 'server-only'/)
    }
  })
})
