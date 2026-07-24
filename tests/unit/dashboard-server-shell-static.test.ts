import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('app/page.tsx', 'utf8')
const fallback = readFileSync('app/components/dashboard/DashboardServerFallback.tsx', 'utf8')
const island = readFileSync('app/components/dashboard/DashboardClientIsland.tsx', 'utf8')
const runtime = readFileSync('app/components/dashboard/useDashboardClientRuntime.ts', 'utf8')

describe('dashboard server shell architecture', () => {
  it('keeps the App Router page as a parameterless Server Component', () => {
    expect(page).not.toContain("'use client'")
    expect(page).toContain('export default function DashboardPage()')
    expect(page).toContain('data-dashboard-server-shell')
    expect(page).toContain('<Suspense fallback={<DashboardServerFallback />}>')
    expect(page).toContain('<DashboardClientIsland />')
    expect(page).not.toMatch(/export default function \w+\s*\([^)]/)
  })

  it('keeps browser APIs, hooks, and browser data clients out of the server boundary', () => {
    for (const forbidden of [
      'useState', 'useEffect', 'useClientDashboard', 'window.', 'document.',
      'localStorage', 'getSupabaseBrowserClient', 'createBrowserClient',
      'createClient', 'service_role', "select('*')",
    ]) expect(page).not.toContain(forbidden)
  })

  it('serializes no identity, session, role, email, or credential', () => {
    for (const forbidden of ['Session', 'initialSession', 'userId', 'access_token', 'refresh_token', 'cookie', 'email', 'role=']) {
      expect(page).not.toContain(forbidden)
    }
    expect(page).not.toContain('{...')
  })

  it('renders a useful static loading boundary while client authority initializes', () => {
    expect(fallback).not.toContain("'use client'")
    expect(fallback).toContain('role="status"')
    expect(fallback).toContain('aria-label="Chargement de MoovX"')
    expect(fallback).toContain('src="/logo-moovx-96.png"')
    expect(island).toContain('return <DashboardServerFallback />')
  })

  it('keeps every new boundary below 500 lines and introduces no second auth/profile load', () => {
    for (const [name, source] of Object.entries({ page, fallback, island, runtime })) {
      expect(source.split('\n').length, name).toBeLessThan(500)
    }
    const combined = `${page}\n${island}\n${runtime}`
    expect(combined.match(/useClientDashboard\(\)/g)).toHaveLength(1)
    expect(combined).not.toContain('auth.getUser')
    expect(combined).not.toContain('auth.getSession')
    expect(combined).not.toContain("from('profiles')")
  })
})
