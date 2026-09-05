import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const shell = readFileSync('app/components/progression-v2/ProgressionV2.tsx', 'utf8')
const progressTab = readFileSync('app/components/tabs/ProgressTab.tsx', 'utf8')
const css = readFileSync('app/components/progression-v2/ProgressionV2.module.css', 'utf8')

describe('Progression V2 section navigation position', () => {
  it('renders one global navigation after Hero and Key Trends but before every detail section', () => {
    const hero = shell.indexOf('<ProgressionHero')
    const trends = shell.indexOf('<KeyTrends')
    const navigation = shell.indexOf('<nav className={styles.sectionNav}')
    const weight = shell.indexOf('<WeightHistory')
    const performance = shell.indexOf('<div className={styles.performanceGrid}>')
    const body = shell.indexOf('<BodyMeasurements')
    const history = shell.indexOf('{children}')

    expect([hero, trends, navigation, weight, performance, body, history].every(index => index >= 0)).toBe(true)
    expect(hero).toBeLessThan(trends)
    expect(trends).toBeLessThan(navigation)
    expect(navigation).toBeLessThan(weight)
    expect(weight).toBeLessThan(performance)
    expect(performance).toBeLessThan(body)
    expect(body).toBeLessThan(history)
    expect(`${shell}\n${progressTab}`.match(/<nav className=/g)).toHaveLength(1)
  })

  it('keeps the four labels and their existing anchor targets', () => {
    expect(shell).toContain("['weight', 'performance', 'body', 'history']")
    expect(progressTab).toContain("? 'progression-v2-weight'")
    expect(progressTab).toContain("? 'progression-v2-records'")
    expect(progressTab).toContain("? 'progression-v2-measurements'")
    expect(progressTab).toContain(": 'progression-v2-history'")
  })

  it('uses CSS scroll offsets and keeps the current active-state behavior', () => {
    expect(css).toMatch(/\.detailSection \{[^}]*scroll-margin-top:\s*76px/)
    expect(css).toMatch(/\.performanceCard \{[^}]*scroll-margin-top:\s*76px/)
    expect(css).toMatch(/\.historySection \{[^}]*scroll-margin-top:\s*76px/)
    expect(shell).toContain('aria-pressed={activeSection === section}')
    expect(shell).toContain('onSectionNavigate(section)')
    expect(progressTab).toContain("useState<ProgressionSection>('weight')")
  })

  it('does not introduce data or business decisions in the navigation shell', () => {
    expect(shell).not.toMatch(/supabase|\.from\(|fetch\(|subscription|entitlement|coach_clients/i)
    expect(shell).toContain('model: ProgressionViewModel')
  })
})
