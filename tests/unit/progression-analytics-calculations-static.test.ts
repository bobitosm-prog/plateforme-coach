import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const modules = ['analytics-training.ts', 'analytics-presenter.ts']
const source = modules.map(file => fs.readFileSync(path.join(process.cwd(), 'lib/progression', file), 'utf8')).join('\n')
const component = fs.readFileSync(path.join(process.cwd(), 'app/components/AnalyticsSection.tsx'), 'utf8')
const hook = fs.readFileSync(path.join(process.cwd(), 'app/hooks/useAnalytics.ts'), 'utf8')

describe('analytics calculation architecture', () => {
  it('keeps the extracted calculation modules pure and typed', () => {
    for (const forbidden of ['react', 'next/', 'supabase', 'createClient', 'localStorage', 'sessionStorage', 'globalThis.window', 'fetch(']) expect(source).not.toContain(forbidden)
    expect(source).not.toMatch(/\bany\b/)
    expect(source).not.toContain('Date.now()')
  })

  it('delegates every sensitive inline calculation from AnalyticsSection', () => {
    for (const delegated of ['buildLegacyExerciseProgression', 'aggregateLegacyMuscleVolume28d', 'aggregateLegacyMuscleRir28d', 'buildLegacyWeightSeries', 'buildLegacyCalorieSeries', 'buildLegacyMacroSeries', 'buildLegacyWaterSeries', 'buildLegacyAnalyticsSummary', 'buildLegacyAnalyticsCsvRows']) expect(component).toContain(delegated)
    expect(component).not.toContain('const cutoff = Date.now()')
    expect(component).not.toContain('const thirtyDaysAgo = Date.now()')
  })

  it('names and delegates the mixed local/UTC weekly strategy', () => {
    expect(hook).toContain('groupMixedLocalUtcLegacyWeeklyTonnage')
    expect(hook).not.toContain('weekStart.setDate')
  })
})
