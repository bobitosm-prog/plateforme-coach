import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { acquireE2eLock, assertLocalE2eUrl, redactE2eOutput } from '../../scripts/e2e-local-contract.mjs'

describe('critical E2E local contract', () => {
  it('accepts localhost and rejects remote origins', () => {
    expect(assertLocalE2eUrl('http://127.0.0.1:3210').hostname).toBe('127.0.0.1')
    expect(assertLocalE2eUrl('https://localhost:55328').hostname).toBe('localhost')
    expect(() => assertLocalE2eUrl('https://example.com')).toThrow('Refusing non-local')
  })

  it('redacts credentials and sensitive conversational fields', () => {
    const jwt = `eyJ${'a'.repeat(20)}.${'b'.repeat(20)}.${'c'.repeat(20)}`
    const output = redactE2eOutput(`authorization=Bearer-secret cookie=session-secret invitation_token=invite ${jwt} {"prompt":"private profile"}`)
    expect(output).not.toContain('Bearer-secret')
    expect(output).not.toContain('session-secret')
    expect(output).not.toContain('private profile')
    expect(output).not.toContain(jwt)
  })

  it('refuses two concurrent suites and releases the lock', () => {
    const directory = mkdtempSync(join(tmpdir(), 'moovx-critical-e2e-'))
    const lock = join(directory, 'suite.lock')
    try {
      const release = acquireE2eLock(lock, 'critical E2E suite', 123)
      expect(() => acquireE2eLock(lock, 'critical E2E suite', 456)).toThrow('pid 123')
      release()
      const releaseAgain = acquireE2eLock(lock, 'critical E2E suite', 456)
      releaseAgain()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('keeps the canonical suite sequential and complete', () => {
    const script = readFileSync(new URL('../../scripts/run-critical-e2e.mjs', import.meta.url), 'utf8')
    const localRunner = readFileSync(new URL('../../scripts/run-local-e2e.mjs', import.meta.url), 'utf8')
    for (const spec of ['coach-invitation', 'platform-checkout', 'coach-checkout', 'push-notification', 'chat-ai']) {
      expect(script).toContain(`e2e/${spec}.spec.ts`)
    }
    expect(localRunner).toContain("'--workers=1'")
    expect(script).toContain("['scripts/supabase-local.mjs', 'reset']")
  })
})
