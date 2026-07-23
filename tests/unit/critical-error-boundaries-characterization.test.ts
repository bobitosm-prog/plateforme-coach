import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const rootError = readFileSync('app/error.tsx', 'utf8')
const domainBoundary = readFileSync('app/components/errors/DomainErrorBoundary.tsx', 'utf8')
const domainView = readFileSync('app/components/errors/DomainErrorView.tsx', 'utf8')
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

describe('critical error boundaries characterization', () => {
  it('records the global App Router adapter and shared boundary', () => {
    expect(rootError).toContain("'use client'")
    expect(rootError).toContain('AppRouterErrorProps')
    expect(rootError).toContain('<DomainErrorBoundary domain="global" reset={reset} />')
    expect(domainBoundary).toContain('onRetry={handleReset}')
  })

  it('records the committed coach and client detail segment boundaries', () => {
    expect(existsAtHead('app/coach/error.tsx')).toBe(true)
    expect(existsAtHead('app/client/[id]/error.tsx')).toBe(true)
  })

  it('keeps profile and protected-detail failures as distinct local states', () => {
    expect(profileError).toContain('data-testid="profile-load-error"')
    expect(profileError).toContain('PROFIL INDISPONIBLE')
    expect(clientStates).toContain('ClientDetailUnavailableView')
    expect(clientStates).toContain('{message}')
  })

  it('keeps retry and fallback navigation in the shared controller', () => {
    expect(domainView).toContain('disabled={retrying}')
    expect(domainView).toContain('aria-live="polite"')
    expect(domainBoundary).toContain('router.replace(copy.navigationTarget)')
  })
})
