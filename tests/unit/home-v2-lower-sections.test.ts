import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  hasActiveCoachWeek,
  isTodayCoachSession,
} from '@/app/components/home-v2/HomeV2LowerSections'

const read = (path: string) => readFileSync(path, 'utf8')
const lower = read('app/components/home-v2/HomeV2LowerSections.tsx')
const home = read('app/components/home-v2/HomeV2.tsx')
const homeTab = read('app/components/tabs/HomeTab.tsx')
const css = read('app/components/home-v2/HomeV2.module.css')

function coach(relationStatus: string, coachId: string | null) {
  return { relationStatus, coachId } as Parameters<typeof hasActiveCoachWeek>[0]
}

describe('Home V2 lower sections', () => {
  it('keeps check-in compact initially and opens the controlled form from CTA or NBA', () => {
    expect(lower).toContain('useState(false)')
    expect(lower).toContain('aria-expanded={expanded}')
    expect(lower).toContain('aria-controls={panelId}')
    expect(lower).toContain("expanded && <div id={panelId}")
    expect(homeTab).toContain('lowerSectionsRef.current?.openCheckIn()')
    expect(lower).not.toMatch(/last7Checkins|mini-timeline|repeat\(7/)
  })

  it('uses the Home model check-in and performs only an explicit save', () => {
    expect(lower).toContain('model.checkIn.completedToday')
    expect(lower).toContain('model.checkIn.mood')
    expect(lower).toContain("model.checkIn.state === 'error'")
    expect(homeTab).not.toMatch(/from\('daily_checkins'\)\.select/)
    expect(homeTab).toContain("from('daily_checkins').upsert")
    expect(homeTab).not.toMatch(/Auto-save check-in|checkinSaveRef|setTimeout\(\(\) => saveCheckin/)
    expect(homeTab).not.toContain('homeRefreshKey')
  })

  it('keeps hydration optimistic, local and reversible on mutation error', () => {
    expect(homeTab).toContain("from('water_intake').insert")
    expect(homeTab).toContain('setWaterToday(previous => previous + ml)')
    expect(homeTab).toContain('setWaterToday(previous => Math.max(0, previous - ml))')
    expect(lower).toContain('role="progressbar"')
    expect(lower).toContain("onAddWater(250)")
  })

  it('keeps diagnostic generation explicit and compact', () => {
    expect(lower).toContain('diagnostic.score_semaine')
    expect(lower).toContain('diagnostic.points_forts?.[0]')
    expect(lower).toContain('diagnostic ? onViewDiagnostic : onGenerateDiagnostic')
    expect(lower).toContain('model.diagnostic.canGenerate')
    expect(lower).toContain("model.diagnostic.state === 'error'")
    expect(lower).not.toMatch(/useEffect[\s\S]{0,240}onGenerateDiagnostic/)
  })

  it('shows coach planning only with a verified active relation and coach id', () => {
    expect(hasActiveCoachWeek(coach('active', 'coach-1'))).toBe(true)
    expect(hasActiveCoachWeek(coach('active', null))).toBe(false)
    expect(hasActiveCoachWeek(coach('ended', 'coach-1'))).toBe(false)
    expect(hasActiveCoachWeek(coach('not_found', 'coach-1'))).toBe(false)
    expect(hasActiveCoachWeek(coach('error', 'coach-1'))).toBe(false)
    expect(lower).not.toMatch(/coachManaged|aiAllowed/)
  })

  it('does not duplicate today as the upcoming coach session', () => {
    const today = { weekday: 'mardi', day: { name: 'Pull' } }
    const future = { weekday: 'jeudi', day: { name: 'Legs' } }
    expect(isTodayCoachSession(today, 'mardi')).toBe(true)
    expect(isTodayCoachSession(future, 'mardi')).toBe(false)
    expect(lower).toContain("nextSession && !isTodayCoachSession(nextSession, todayKey)")
  })

  it('renders the lower orchestration inside the single Home V2 shell', () => {
    expect(home).toContain('{children && <div className={styles.lowerContent}>{children}</div>}')
    expect(homeTab).toContain('<HomeV2LowerSections')
    expect(homeTab.indexOf('<HomeV2LowerSections')).toBeLessThan(homeTab.indexOf('</HomeV2>'))
    expect(homeTab).not.toMatch(/SectionTitle|WeeklyDiagnosticCard|last7Checkins/)
    expect(lower).not.toMatch(/supabase|\.from\(|fetch\(|axios/i)
  })

  it('uses responsive Home V2 grids and accessible mobile-sized controls', () => {
    expect(css).toMatch(/\.lowerGrid, \.weeklyGrid\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\)/)
    expect(css).toMatch(/@media \(min-width: 700px\)[\s\S]*\.lowerGrid, \.weeklyGrid\s*\{[^}]*repeat\(2,minmax\(0,1fr\)\)/)
    expect(css).toMatch(/\.moodGrid\s*\{[^}]*repeat\(5,minmax\(48px,1fr\)\)/)
    expect(css).toMatch(/\.compactButton\s*\{[^}]*min-height:\s*44px/)
    expect(css).not.toMatch(/font-size:\s*(?:8|9|10)px/)
  })

  it('does not add backend or relational reads', () => {
    const directReads = homeTab.match(/\.from\('/g)?.length ?? 0
    expect(directReads).toBeLessThanOrEqual(11)
    expect(`${homeTab}\n${lower}`).not.toMatch(/coach_clients|\/api\/.*(?:lower|hydration|check-in)/)
  })
})
