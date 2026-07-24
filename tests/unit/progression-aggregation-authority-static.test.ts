import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkProgressionAggregationAuthority } from '../../scripts/check-progression-aggregation-authority'

describe('Progression aggregation authority architecture', () => {
  it('covers the named RC1 consumers without directory allowlists', () => {
    const consumers = checkProgressionAggregationAuthority().consumers
    expect(consumers).toEqual(expect.arrayContaining([
      'app/components/AnalyticsSection.tsx',
      'app/hooks/useAnalytics.ts',
      'app/components/tabs/ProgressTab.tsx',
      'app/components/tabs/progression/useProgressTabController.ts',
      'app/coach/hooks/useCoachAnalytics.ts',
      'app/(dashboard)/page-desktop.tsx',
      'lib/client-dashboard/use-client-dashboard-actions.ts',
      'lib/training/session-history.ts',
      'lib/training/workout-session-model.ts',
    ]))
    expect(consumers.every(file => /\.[cm]?[jt]sx?$/.test(file))).toBe(true)
  })

  it('keeps the guard pure and independent from Git', () => {
    const guard = readFileSync('lib/progression/aggregation-authority-guard.ts', 'utf8')
    const runner = readFileSync('scripts/check-progression-aggregation-authority.ts', 'utf8')
    expect(guard).not.toMatch(/react|next|supabase|window|document|localStorage|fetch\(/i)
    expect(runner).not.toMatch(/git|diff|HEAD|staged/)
  })
})
