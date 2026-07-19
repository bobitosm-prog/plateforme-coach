import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const page = readFileSync('app/coach/page.tsx', 'utf8')
const desktop = readFileSync('app/coach/components/sections/CoachDesktopLayout.tsx', 'utf8')
const mobile = readFileSync('app/coach/components/sections/CoachMobileLayout.tsx', 'utf8')
const contract = readFileSync('app/coach/components/sections/coach-page-types.ts', 'utf8')
const wheel = readFileSync('app/coach/components/sections/CoachSessionWheelPicker.tsx', 'utf8')

describe('coach page lazy section architecture', () => {
  it('keeps the page as a small orchestrator and every boundary below 500 lines', () => {
    for (const [name, source, limit] of [['page', page, 250], ['desktop', desktop, 500], ['mobile', mobile, 500], ['contract', contract, 500], ['wheel', wheel, 500]] as const) {
      expect(source.split('\n').length, name).toBeLessThan(limit)
    }
    expect(page).toContain('useCoachDashboard(initialSession)')
    expect(page).toContain('isDesktop ? <CoachDesktopLayout')
  })

  it('loads layouts and non-initial sections dynamically without duplicate static imports', () => {
    expect(page).toContain("dynamic(() => import('./components/sections/CoachDesktopLayout')")
    expect(page).toContain("dynamic(() => import('./components/sections/CoachMobileLayout')")
    for (const source of [desktop, mobile]) {
      for (const section of ['ClientsList', 'CoachCalendar', 'CoachMessages', 'CoachAliments', 'CoachProfile', 'CoachPrograms', 'CoachAnalytics', 'SessionDetailModal']) {
        expect(source, section).toContain(`const ${section} = dynamic(`)
        expect(source, section).not.toMatch(new RegExp(`import ${section} from`))
      }
      expect(source).toContain('loading: CoachSectionFallback')
    }
  })

  it('keeps sections present in both responsive layouts and preserves modal wiring', () => {
    for (const source of [desktop, mobile]) {
      for (const section of ['accueil', 'dashboard', 'calendar', 'messages', 'suivi', 'programs', 'aliments', 'profil']) expect(source).toContain(`h.section === '${section}'`)
      expect(source).toContain('h.showNewSession &&')
      expect(source).toContain('h.selectedSession &&')
      expect(source).toContain('onDelete={h.deleteSession}')
    }
  })

  it('keeps presentation boundaries free of direct data authority and wildcard reads', () => {
    for (const source of [desktop, mobile, wheel]) {
      expect(source).not.toContain('createClient')
      expect(source).not.toContain('service_role')
      expect(source).not.toContain("select('*')")
      expect(source).not.toMatch(/from ['"]@\/lib\/(?:repositories|supabase)/)
      expect(source).not.toMatch(/\bany\b/)
    }
  })
})
