import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { TEST_PERSONAS, createRunSuffix, isConfiguredAdmin, personaForRun } from '../fixtures/personas'
import { assertLocalFixtureEnvironment, createLocalAuthUser, createLocalPersona } from '../fixtures/supabase'

describe('shared test personas contract', () => {
  it('keeps identifiers and emails unique and synthetic', () => {
    const personas = Object.values(TEST_PERSONAS)
    expect(new Set(personas.map(persona => persona.id)).size).toBe(personas.length)
    expect(new Set(personas.map(persona => persona.email)).size).toBe(personas.length)
    expect(personas.every(persona => persona.email.endsWith('@moovx.example.test'))).toBe(true)
  })

  it('separates role, subscription and configured admin authority', () => {
    expect(TEST_PERSONAS.invited).toMatchObject({ role: 'client', subscriptionType: 'invited', admin: false })
    expect(TEST_PERSONAS.lifetime).toMatchObject({ role: 'client', subscriptionType: 'lifetime', subscriptionStatus: 'lifetime', admin: false })
    expect(TEST_PERSONAS.admin).toMatchObject({ role: 'client', admin: true })
    expect(isConfiguredAdmin(TEST_PERSONAS.admin, TEST_PERSONAS.admin.email)).toBe(true)
    expect(isConfiguredAdmin(TEST_PERSONAS.lifetime, TEST_PERSONAS.admin.email)).toBe(false)
  })

  it('creates unique per-run identities without changing the persona contract', () => {
    const first = personaForRun('client', createRunSuffix())
    const second = personaForRun('client', createRunSuffix())
    expect(first.id).not.toBe(second.id)
    expect(first.email).not.toBe(second.email)
    expect(first.role).toBe('client')
    expect(first.subscriptionType).toBe('client_monthly')
  })

  it.each([
    ['https://project.supabase.co', 'e2e'],
    ['http://192.0.2.10:54321', 'test'],
    ['http://127.0.0.1:55321', undefined],
  ] as const)('refuses unsafe fixture environment %s', (url, mode) => {
    expect(() => assertLocalFixtureEnvironment(url, mode)).toThrow()
  })

  it('accepts only explicit local test modes', () => {
    expect(assertLocalFixtureEnvironment('http://127.0.0.1:55321', 'e2e').hostname).toBe('127.0.0.1')
    expect(assertLocalFixtureEnvironment('http://localhost:55321', 'test').hostname).toBe('localhost')
  })

  it('keeps the generated SQL synchronized with the JSON manifest', () => {
    const generated = execFileSync(process.execPath, ['scripts/generate-test-personas-sql.mjs'], { encoding: 'utf8' })
    const committed = readFileSync('tests/integration/test-personas.sql', 'utf8')
    expect(committed).toBe(generated)
  })

  it('defines duplicate Auth creation as an explicit error', async () => {
    const createUser = vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'already registered' } })
    const admin = { auth: { admin: { createUser } } }
    await expect(createLocalAuthUser(admin as never, TEST_PERSONAS.client, 'ephemeral')).rejects.toThrow('already registered')
  })

  it('cleans up Auth after a partial profile creation failure', async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null })
    const admin = {
      auth: { admin: { createUser: vi.fn().mockResolvedValue({ data: { user: { id: TEST_PERSONAS.client.id } }, error: null }), deleteUser } },
      from: vi.fn().mockReturnValue({ upsert: vi.fn().mockResolvedValue({ error: { message: 'forced profile failure' } }) }),
    }
    await expect(createLocalPersona(admin as never, TEST_PERSONAS.client, 'ephemeral')).rejects.toThrow('forced profile failure')
    expect(deleteUser).toHaveBeenCalledWith(TEST_PERSONAS.client.id)
  })
})
