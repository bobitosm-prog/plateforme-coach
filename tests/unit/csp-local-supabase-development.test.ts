import { describe, expect, it } from 'vitest'

import { getLocalSupabaseCspSources } from '../../next.config'

describe('local Supabase CSP development sources', () => {
  it.each([
    ['http://127.0.0.1:55321', ['http://127.0.0.1:55321', 'ws://127.0.0.1:55321']],
    ['http://localhost:55321', ['http://localhost:55321', 'ws://localhost:55321']],
    ['http://[::1]:55321', ['http://[::1]:55321', 'ws://[::1]:55321']],
    ['https://localhost:55321', ['https://localhost:55321', 'wss://localhost:55321']],
  ])('allows the exact loopback origin in development: %s', (url, expected) => {
    expect(getLocalSupabaseCspSources('development', url)).toEqual(expected)
  })

  it('does not add a local origin in production', () => {
    expect(getLocalSupabaseCspSources('production', 'http://localhost:55321')).toEqual([])
  })

  it.each([
    'http://evil.example.com',
    'https://supabase.example.com',
    'ftp://localhost:55321',
    'not a URL',
    '',
  ])('ignores unsafe or invalid configuration without throwing: %s', url => {
    expect(() => getLocalSupabaseCspSources('development', url)).not.toThrow()
    expect(getLocalSupabaseCspSources('development', url)).toEqual([])
  })

  it('never returns a global source wildcard', () => {
    const sources = getLocalSupabaseCspSources('development', 'http://localhost:55321')

    expect(sources).not.toContain('*')
    expect(sources).not.toContain('http:')
    expect(sources).not.toContain('ws:')
  })
})
