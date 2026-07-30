import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  acquireE2eLock,
  assertLocalE2eUrl,
  CRITICAL_E2E_TARGET_MATRIX,
  getIntegratedCriticalE2eScenarios,
  redactE2eOutput,
  validateCriticalE2eTargetMatrix,
} from '../../scripts/e2e-local-contract.mjs'

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
    expect(script).toContain('getIntegratedCriticalE2eScenarios()')
    expect(localRunner).toContain("'--workers=1'")
    expect(script).toContain("['scripts/supabase-local.mjs', 'reset']")
  })

  it('defines 15 unique target journeys and integrates only the qualified six', () => {
    expect(validateCriticalE2eTargetMatrix()).toBe(CRITICAL_E2E_TARGET_MATRIX)
    expect(new Set(CRITICAL_E2E_TARGET_MATRIX.map(journey => journey.name)).size).toBe(15)

    const integrated = getIntegratedCriticalE2eScenarios()
    expect(integrated.map(journey => journey.spec)).toEqual([
      'e2e/coach-invitation.spec.ts',
      'e2e/platform-checkout.spec.ts',
      'e2e/coach-checkout.spec.ts',
      'e2e/push-notification.spec.ts',
      'e2e/chat-ai.spec.ts',
      'e2e/auth-registration-flow.spec.ts',
    ])
    expect(CRITICAL_E2E_TARGET_MATRIX.filter(journey => !journey.integrated)).toHaveLength(9)
    expect(CRITICAL_E2E_TARGET_MATRIX.every(journey => (
      !/performance|perf\//i.test(`${journey.name} ${journey.spec || ''}`)
    ))).toBe(true)
  })

  it('rejects malformed matrices before executing the canonical suite', () => {
    expect(() => validateCriticalE2eTargetMatrix(CRITICAL_E2E_TARGET_MATRIX.slice(0, 14))).toThrow('exactly 15')
    const duplicate = CRITICAL_E2E_TARGET_MATRIX.map((journey, index) => (
      index === 14 ? { ...journey, name: CRITICAL_E2E_TARGET_MATRIX[0].name } : journey
    ))
    expect(() => validateCriticalE2eTargetMatrix(duplicate)).toThrow('duplicate journey names')
  })
})
