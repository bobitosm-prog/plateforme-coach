import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const component = readFileSync('app/components/home-v2/DailyStatus.tsx', 'utf8')
const home = readFileSync('app/components/home-v2/HomeV2.tsx', 'utf8')
const css = readFileSync('app/components/home-v2/HomeV2.module.css', 'utf8')

describe('unified daily status cards', () => {
  it('shows the workout once and keeps nutrition and recovery facts in their cards', () => {
    expect(component).toContain('<TodayHero')
    expect(component.match(/<article className={styles.statusTile}/g)).toHaveLength(2)
    expect(component).toContain('data-domain="nutrition"')
    expect(component).toContain('data-domain="recovery"')
    expect(component).not.toContain('daily-status-panel')
    expect(component).not.toContain('aria-expanded')
    expect(home).not.toContain('<TodayHero')
  })

  it('keeps factual nullable values and all three domain actions', () => {
    expect(component).toContain('nutrition.caloriesConsumed != null && nutrition.caloriesTarget != null')
    expect(component).toContain('onStartSession={onStartSession}')
    expect(component).toContain('onOpenSession={onOpenSession}')
    expect(component).toContain('onClick={onOpenNutrition}')
    expect(component).toContain('onClick={onOpenRecovery}')
    expect(component).not.toMatch(/duration|readiness|score/i)
  })

  it('uses explicit status text rather than invented readiness values', () => {
    expect(component).toContain('t(`nutrition.${presentation.nutrition.status}`)')
    expect(component).toContain('t(`recovery.${presentation.recovery.status}`)')
    expect(css).toContain('.statusTileCopy strong')
    expect(component).not.toMatch(/aria-valuenow|progressbar/)
  })

  it('provides visible focus and 44px actions', () => {
    expect(css).toMatch(/\.statusTileLink:focus-visible, \.statusTileIconAction:focus-visible/)
    expect(css).toMatch(/\.statusTileLink, \.statusTileIconAction\s*\{[^}]*min-height:\s*44px/)
  })
})
