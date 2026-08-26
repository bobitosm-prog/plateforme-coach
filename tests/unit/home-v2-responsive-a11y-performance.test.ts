import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(path, 'utf8')

describe('Home V2 responsive and accessibility guard', () => {
  const css = read('app/components/home-v2/HomeV2.module.css')
  const home = read('app/components/home-v2/HomeV2.tsx')
  const hero = read('app/components/home-v2/TodayHero.tsx')
  const dailyStatus = read('app/components/home-v2/DailyStatus.tsx')
  const progression = read('app/components/home-v2/ProgressionSnapshot.tsx')
  const athena = read('app/components/home-v2/AthenaInsightCard.tsx')
  const coach = read('app/components/home-v2/ActiveCoachCard.tsx')

  it('keeps one adaptive Home implementation without a desktop fork', () => {
    expect(home).not.toMatch(/DesktopDashboard|MobileHome|window\.innerWidth|useMediaQuery/)
    expect(css).toMatch(/\.shell\s*\{[^}]*width:\s*100%/)
    expect(css).toMatch(/\.statusGrid\s*\{[^}]*grid-template-columns:\s*1fr/)
    expect(css).toMatch(/@media \(min-width: 700px\)[\s\S]*\.statusGrid/)
    expect(css).toMatch(/\.intelligenceGrid\s*\{[^}]*minmax\(min\(100%,340px\),1fr\)/)
    const shellRule = css.match(/\.shell\s*\{([^}]*)\}/)?.[1] ?? ''
    const heroRule = css.match(/\.hero\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(shellRule).not.toMatch(/(?:^|;)\s*width:\s*\d+px/)
    expect(heroRule).not.toMatch(/(?:^|;)\s*width:\s*\d+px/)
  })

  it('preserves visible keyboard focus, touch targets and reduced motion', () => {
    expect(css).toMatch(/\.button:focus-visible/)
    expect(css).toMatch(/\.progressionLink:focus-visible/)
    expect(css).toMatch(/\.intelligenceCta:focus-visible/)
    expect(css).toMatch(/\.progressionLink\s*\{[^}]*min-height:\s*44px/)
    expect(css).toMatch(/\.intelligenceCta\s*\{[^}]*min-height:\s*44px/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:\s*none/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.button:hover\s*\{\s*transform:\s*none/)
  })

  it('exposes loading and error states to assistive technology', () => {
    expect(hero).toContain('aria-busy="true"')
    expect(hero).toContain('role="status"')
    expect(dailyStatus).toContain("aria-busy={state === 'loading'}")
    expect(dailyStatus).toContain("role={state === 'error' ? 'status' : undefined}")
    expect(progression).toContain("aria-busy={state === 'loading'}")
    expect(athena).toContain("aria-busy={insight.type === 'loading'}")
    expect(coach).toContain('aria-busy="true"')
    expect(dailyStatus).toContain("nutritionStatus === 'ready'")
    expect(progression).not.toContain("progression.state === 'error' ? 0")
  })

  it('uses semantic controls and headings for the main actions', () => {
    expect(hero).not.toMatch(/<button(?![^>]*type=)/)
    expect(athena).toContain('<h2 className={styles.intelligenceLabel}>')
    expect(coach).toContain('<h2 className={styles.intelligenceLabel}>')
  })
})

describe('Home V2 performance and architecture guard', () => {
  const home = read('app/components/home-v2/HomeV2.tsx')
  const legacyHome = read('app/components/tabs/HomeTab.tsx')
  const diagnostic = read('app/components/home/cards/WeeklyDiagnosticCard.tsx')
  const visualComponents = [
    'TodayHero',
    'DailyStatus',
    'NextBestActionCard',
    'ProgressionSnapshot',
    'AthenaInsightCard',
    'ActiveCoachCard',
  ].map(name => read(`app/components/home-v2/${name}.tsx`)).join('\n')

  it('keeps visual Home V2 components free of direct data reads', () => {
    expect(visualComponents).not.toMatch(/supabase|\.from\(|fetch\(|axios/i)
    expect(home).not.toMatch(/supabase|\.from\(|fetch\(|axios/i)
  })

  it('does not use product capabilities as coach relation proof', () => {
    expect(read('app/components/home-v2/ActiveCoachCard.tsx')).not.toContain('coachManaged')
  })

  it('does not globally refetch Home data whenever the tab becomes active', () => {
    expect(legacyHome).not.toContain('homeRefreshKey')
    expect(legacyHome).not.toContain("activeTab === 'home'")
  })

  it('removes superseded low-value reads and the duplicate mindset closer', () => {
    expect(legacyHome).not.toMatch(/from\('weight_logs'\)|from\('user_xp'\)|from\('daily_habits'\)/)
    expect(legacyHome).not.toContain('MOOVX MINDSET')
    expect(legacyHome).not.toContain('closerLabel')
    expect(legacyHome).not.toContain("supabase.from('coach_appointments')")
    expect(legacyHome).not.toContain('PROGRESSION (streak + weight + XP)')
  })

  it('keeps weekly diagnostic generation explicit and exposes failures', () => {
    expect(legacyHome).toContain("fetch('/api/weekly-diagnostic', { method: 'POST' })")
    expect(legacyHome).toContain('onGenerateDiagnostic={handleGenerateDiagnostic}')
    expect(diagnostic).toContain('role="status"')
    expect(diagnostic).toContain('aria-busy={generating}')
  })
})
