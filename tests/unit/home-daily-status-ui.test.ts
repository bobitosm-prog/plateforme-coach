import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const component = readFileSync('app/components/home-v2/DailyStatus.tsx', 'utf8')
const css = readFileSync('app/components/home-v2/HomeV2.module.css', 'utf8')

describe('interactive daily status cockpit contract', () => {
  it('uses three semantic accordion triggers and one separate context panel', () => {
    expect(component).toContain('function SignalRow')
    expect(component).toContain('aria-expanded={selected}')
    expect(component).toContain('aria-controls="daily-status-panel"')
    expect(component).toContain('id="daily-status-panel"')
    expect(component.match(/<SignalRow/g)).toHaveLength(3)
    expect(component.indexOf('className={styles.statusPanel}')).toBeGreaterThan(component.lastIndexOf('<SignalRow'))
  })

  it('keeps factual nullable values and all three domain actions', () => {
    expect(component).toContain('nutrition.caloriesConsumed != null && nutrition.caloriesTarget != null')
    expect(component).toContain('presentation.training.weeklyPlanned > 0')
    expect(component).toMatch(/selectedDomain === 'nutrition'\s*\? onOpenNutrition/)
    expect(component).toMatch(/:\s*onOpenRecovery/)
    expect(component).not.toMatch(/duration|readiness|score/i)
  })

  it('uses a non-numeric three-marker summary and a non-colour active cue', () => {
    expect(component.match(/<SummaryMarker/g)).toHaveLength(3)
    expect(component).toContain('data-active={selected}')
    expect(css).toMatch(/\.statusSignal\[data-active='true'\]\s*\{[^}]*box-shadow:/)
    expect(css).toMatch(/\.statusSignal\[data-active='true'\] \.statusChevron/)
    expect(component).not.toMatch(/aria-valuenow|progressbar/)
  })

  it('provides visible focus, 48px actions and reduced motion', () => {
    expect(css).toMatch(/\.statusSignal:focus-visible/)
    expect(css).toMatch(/\.statusAction\s*\{[^}]*min-height:\s*48px/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[^}]*\{[^}]*\.statusPanel/)
  })
})
