import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('app/components/progression-v2/ProgressionV2.module.css', 'utf8')
const hero = readFileSync('app/components/progression-v2/ProgressionHero.tsx', 'utf8')

describe('Analytics visual parity', () => {
  it('uses the flat card and heading system without changing the metrics or period controls', () => {
    expect(css).toContain('background: #1d1c19')
    expect(css).toContain('background: #27251f')
    expect(css).toContain('font-size: clamp(2.35rem, 9vw, 3.5rem)')
    expect(css).toContain('padding: 20px 16px calc(150px + env(safe-area-inset-bottom, 0px))')
    expect(hero).toContain('model.summary.currentWeight')
    expect(hero).toContain('onPeriodChange(period)')
    expect(hero).toContain('onAddMeasurement')
  })
})
