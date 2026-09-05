import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const page = readFileSync('app/(application)/page.tsx', 'utf8')
const lowerHome = readFileSync('app/components/home-v2/HomeV2LowerSections.tsx', 'utf8')

describe('Home V2 mobile bottom navigation clearance', () => {
  it('reserves nav, floating action and iOS safe-area space on the Home scroller', () => {
    expect(page).toContain(".app-shell {\n          --mobile-bottom-nav-height: 100px")
    expect(page).toContain('--mobile-bottom-visual-gap: 20px')
    expect(page).toContain('--mobile-floating-action-gap: 12px')
    expect(page).toContain('--mobile-athena-fab-size: 52px')
    expect(page).toContain('className="client-main-scroll client-main-scroll-home"')
    expect(page).toMatch(/\.client-main-scroll-home\s*\{[\s\S]*?var\(--mobile-bottom-nav-height\)[\s\S]*?var\(--mobile-floating-action-gap\)[\s\S]*?var\(--mobile-athena-fab-size\)[\s\S]*?var\(--mobile-bottom-visual-gap\)[\s\S]*?env\(safe-area-inset-bottom, 0px\)/)
    expect(page).not.toContain('padding-bottom: calc(240px')
  })

  it('keeps the bottom navigation fixed and safe-area aware', () => {
    expect(page).toContain("className=\"mobile-nav\" style={{ position: 'fixed', bottom: 0")
    expect(page).toContain("paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 8px)'")
    expect(page).toContain('zIndex: Z_NAV')
  })

  it('keeps Athena above the nav while Home can scroll clear of it', () => {
    expect(page).toContain('className="client-athena-fab"')
    expect(page).toMatch(/\.client-athena-fab\s*\{[\s\S]*?bottom: calc\(var\(--mobile-bottom-nav-height\) \+ var\(--mobile-floating-action-gap\) \+ env\(safe-area-inset-bottom, 0px\)\)/)
    expect(page).not.toContain('--mobile-chat-fab-size')
    expect(page).not.toContain('.bug-report-fab')
    expect(page).toContain("bottom: 'calc(136px + env(safe-area-inset-bottom, 0px))'")
  })

  it('removes the extra mobile clearance at tablet and desktop widths', () => {
    expect(page).toMatch(/@media \(min-width: 768px\)\s*\{[\s\S]*?\.client-main-scroll,[\s\S]*?\.client-main-scroll-home\s*\{ padding-bottom: 16px; \}/)
  })

  it('does not change Planning coach content or its CTA behavior', () => {
    expect(lowerHome).toContain("t('coachWeek.label')")
    expect(lowerHome).toContain("t('coachWeek.cta')")
    expect(lowerHome).toContain('onClick={onOpenTraining}')
    expect(lowerHome).toContain('hasActiveCoachWeek(model.coach)')
  })
})
