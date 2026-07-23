import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rootError = execFileSync('git', ['show', 'HEAD:app/error.tsx'], { encoding: 'utf8' })
const profileError = readFileSync('app/components/dashboard/DashboardProfileError.tsx', 'utf8')
const clientStates = readFileSync('app/client/[id]/components/page/ClientDetailPageStates.tsx', 'utf8')

function existsAtHead(path: string) {
  try {
    execFileSync('git', ['cat-file', '-e', `HEAD:${path}`], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

describe('critical error boundaries before extraction', () => {
  it('records the existing global App Router boundary', () => {
    expect(rootError).toContain("'use client'")
    expect(rootError).toContain('reset: () => void')
    expect(rootError).toContain('onClick={reset}')
  })

  it('records that coach and client detail have no segment error boundary', () => {
    expect(existsAtHead('app/coach/error.tsx')).toBe(false)
    expect(existsAtHead('app/client/[id]/error.tsx')).toBe(false)
  })

  it('keeps profile and protected-detail failures as distinct local states', () => {
    expect(profileError).toContain('data-testid="profile-load-error"')
    expect(profileError).toContain('PROFIL INDISPONIBLE')
    expect(clientStates).toContain('ClientDetailUnavailableView')
    expect(clientStates).toContain('{message}')
  })

  it('shows why the global retry contract needs hardening', () => {
    expect(rootError).not.toContain('disabled=')
    expect(rootError).not.toContain('aria-live=')
    expect(rootError).toContain("router.push('/')")
  })
})
