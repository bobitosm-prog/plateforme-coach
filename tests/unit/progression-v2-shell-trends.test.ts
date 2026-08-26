import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { getProgressionHeroState } from '@/app/components/progression-v2/ProgressionHero'
import {
  buildProgressionViewModel,
  type ProgressionDomainState,
  type ProgressionViewModel,
} from '@/lib/progression/progression-dashboard-model'

const baseModel = buildProgressionViewModel({
  period: '30d',
  now: new Date('2026-08-26T12:00:00.000Z'),
  goal: 'maintain',
  weight: { logs: [{ date: '2026-08-26', poids: 80 }] },
  sessions: { rows: [{ created_at: '2026-08-25T10:00:00Z', completed: true }] },
  records: { rows: [] },
  measurements: { rows: [] },
  photos: { rows: [] },
  wellbeing: { rows: [] },
})

function modelWithSummaryState(state: ProgressionDomainState): ProgressionViewModel {
  return { ...baseModel, summary: { ...baseModel.summary, state } }
}

describe('Progression V2 Hero states', () => {
  it.each(['ready', 'partial', 'empty', 'error'] as const)('preserves the %s state without manufacturing a value', state => {
    expect(getProgressionHeroState(modelWithSummaryState(state))).toBe(state)
  })
})

describe('Progression V2 trends contract', () => {
  const hero = readFileSync('app/components/progression-v2/ProgressionHero.tsx', 'utf8')
  const trends = readFileSync('app/components/progression-v2/KeyTrends.tsx', 'utf8')
  const shell = readFileSync('app/components/progression-v2/ProgressionV2.tsx', 'utf8')
  const css = readFileSync('app/components/progression-v2/ProgressionV2.module.css', 'utf8')
  const progressTab = readFileSync('app/components/tabs/ProgressTab.tsx', 'utf8')
  const dashboard = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')

  it('uses the unified model for the neutral weight trend', () => {
    expect(hero).toContain('model.summary.currentWeight')
    expect(hero).toContain('model.summary.weightDelta')
    expect(trends).toContain('model.weight')
    expect(`${hero}\n${trends}`).not.toMatch(/excellent|mauvais|tu progresses|great progress/i)
  })

  it('shows regularity without inventing adherence', () => {
    expect(trends).toContain('regularity.averageCompleted')
    expect(trends).toContain('regularity.currentWeek?.planned == null')
    expect(trends).not.toContain('regularity.currentWeek?.adherence')
  })

  it('does not manufacture a volume percentage when comparison is unavailable', () => {
    expect(trends).toContain('isFiniteNumber(volume.deltaPercent)')
    expect(trends).toContain("t('comparisonUnavailable')")
  })

  it('provides the four periods and exposes truncated all history', () => {
    expect(hero).toContain("['7d', '30d', '90d', 'all']")
    expect(hero).toContain("model.period.key === 'all' && model.period.isTruncated")
    expect(hero).toContain('model.period.availableFrom')
    expect(hero).toContain('aria-pressed={model.period.key === period}')
    expect(dashboard).toContain("useState<ProgressionPeriod>('30d')")
    expect(dashboard).toContain('period: progressionPeriod')
  })

  it('keeps visual components pure and independent from Home business logic', () => {
    expect(`${hero}\n${trends}\n${shell}`).not.toMatch(/supabase|\.from\(|fetch\(|HomeViewModel|home-dashboard-model|coach_clients|resolveUserCapabilities/i)
    expect(shell).toContain('model: ProgressionViewModel')
  })

  it('replaces only the legacy header and summary while preserving detailed sections', () => {
    expect(progressTab).toContain('<ProgressionV2')
    expect(progressTab).not.toContain('SECTION 1 — HEADER')
    expect(progressTab).not.toContain('3 STATS RÉSUMÉ')
    expect(progressTab).not.toContain('totalVolume')
    for (const section of ['ÉVOLUTION DU POIDS', 'RECORDS PERSONNELS', 'TRANSFORMATION', 'MENSURATIONS', 'BIEN-ÊTRE']) {
      expect(progressTab).toContain(section)
    }
  })

  it('uses one responsive shell for mobile, tablet and desktop', () => {
    expect(css).toContain('.page')
    expect(css).toMatch(/max-width:\s*1180px/)
    expect(css).toContain('@media (max-width: 767px)')
    expect(css).toContain('@media (min-width: 768px)')
    expect(css).toContain('grid-template-columns: repeat(3,minmax(0,1fr))')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})

describe('Progression V2 translations', () => {
  const requiredPaths = [
    'title', 'subtitle', 'addMeasurement', 'periodLabel', 'availableSince',
    'weight', 'regularity', 'volume', 'states.loading', 'states.unavailable',
    'states.insufficient', 'periods.7d', 'periods.30d', 'periods.90d', 'periods.all',
  ]

  function atPath(value: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => (
      current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
    ), value)
  }

  it.each(['fr', 'en', 'de'])('contains every required %s translation', locale => {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as Record<string, unknown>
    const progress = atPath(messages, 'progress.v2')
    for (const path of requiredPaths) expect(atPath(progress, path), `${locale}:${path}`).toEqual(expect.any(String))
  })
})
