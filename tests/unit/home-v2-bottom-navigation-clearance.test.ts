import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const page = readFileSync('app/(application)/page.tsx', 'utf8')
const navStyles = readFileSync('app/(application)/AthleteBottomNav.module.css', 'utf8')
const lowerHome = readFileSync('app/components/home-v2/HomeV2LowerSections.tsx', 'utf8')

describe('Home V2 mobile bottom navigation clearance', () => {
  it('reserves nav and iOS safe-area space on the Home scroller', () => {
    expect(page).toContain(".app-shell {\n          --mobile-bottom-nav-height: 100px")
    expect(page).toContain('--mobile-bottom-visual-gap: 20px')
    expect(page).not.toContain('--mobile-floating-action-gap')
    expect(page).not.toContain('--mobile-athena-fab-size')
    expect(page).toContain('className="client-main-scroll client-main-scroll-home"')
    expect(page).toMatch(/\.client-main-scroll-home\s*\{[\s\S]*?padding-bottom: calc\(85px \+ max\(7px, env\(safe-area-inset-bottom, 0px\)\)\)/)
    expect(page).not.toContain('padding-bottom: calc(240px')
  })

  it('keeps the bottom navigation fixed and safe-area aware', () => {
    expect(page).toContain('className={`mobile-nav ${navStyles.dock}`}')
    expect(navStyles).toContain('position: fixed;')
    expect(navStyles).toContain('bottom: 0;')
    expect(navStyles).toContain('padding: 8px 12px 0;')
    expect(navStyles).toContain('max(7px, env(safe-area-inset-bottom, 0px))')
    expect(page).toContain('zIndex: Z_NAV')
  })

  it('uses five flat, accessible destinations with a visible active state', () => {
    expect(navStyles).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))')
    expect(navStyles).toContain(".item[aria-current='page']")
    expect(navStyles).toContain('.dock::before')
    expect(navStyles).toContain('background: linear-gradient(180deg,')
    expect(navStyles).toContain('-webkit-backdrop-filter: blur(8px)')
    expect(navStyles).toContain('pointer-events: none;')
    expect(page).toContain("aria-current={active ? 'page' : undefined}")
    expect(page).toContain('disabled={overlayOpen}')
    expect(page).toContain('h.unreadCount > 0')
  })

  it('removes the floating Athena shortcut and its reserved scroll space', () => {
    expect(page).not.toContain('className="client-athena-fab"')
    expect(page).not.toContain('--mobile-chat-fab-size')
    expect(page).not.toContain('.bug-report-fab')
    expect(page).not.toContain("bottom: 'calc(136px + env(safe-area-inset-bottom, 0px))'")
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
