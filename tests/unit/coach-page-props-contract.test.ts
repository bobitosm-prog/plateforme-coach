import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('app/coach/page.tsx', 'utf8')
const content = readFileSync('app/coach/components/CoachPageContent.tsx', 'utf8')
const rootPage = readFileSync('app/page.tsx', 'utf8')
const dashboardFacade = readFileSync('app/coach/hooks/useCoachDashboard.ts', 'utf8')

describe('coach App Router page contract', () => {
  it('renders the application component from a parameterless default page export', () => {
    expect(page).toContain('export default function CoachPage()')
    expect(page).toContain('return <CoachPageContent />')
    expect(page).not.toContain('initialSession')
  })

  it('keeps the optional synthetic session on a typed client boundary', () => {
    expect(content).toContain("import type { Session } from '@supabase/supabase-js'")
    expect(content).toContain('export type CoachPageContentProps = {')
    expect(content).toContain('initialSession?: Session | null')
    expect(content).toContain('function CoachPageContent({ initialSession }: CoachPageContentProps = {})')
    expect(content).toContain('<ClientIntlProvider><CoachPageContentInner initialSession={initialSession} /></ClientIntlProvider>')
    expect(rootPage).toContain("dynamic(() => import('./coach/components/CoachPageContent')")
    expect(rootPage).toContain('<CoachDashboard initialSession={h.session} />')
  })

  it('preserves dashboard, lazy layout, auth and navigation wiring', () => {
    expect(content).toContain('useCoachDashboard(initialSession)')
    expect(content).toContain("dynamic(() => import('./sections/CoachDesktopLayout')")
    expect(content).toContain("dynamic(() => import('./sections/CoachMobileLayout')")
    expect(content).toContain("h.router.push('/login')")
    expect(dashboardFacade).toContain('...args: Parameters<typeof useCoachDashboardController>')
  })

  it('does not add data clients or untyped seams to the page boundary', () => {
    for (const source of [page, content]) {
      expect(source).not.toContain('createBrowserClient')
      expect(source).not.toContain('createClient')
      expect(source).not.toContain('service_role')
      expect(source).not.toMatch(/\bany\b/)
    }
  })
})
