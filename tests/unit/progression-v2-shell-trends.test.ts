import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Active Analytics integration', () => {
  const shell = readFileSync('app/components/progression-v2/ProgressionV2.tsx', 'utf8')
  const tab = readFileSync('app/components/tabs/ProgressTab.tsx', 'utf8')
  it('keeps the presentation independent from data fetching and Home business logic', () => {
    expect(shell).not.toMatch(/supabase|\.from\(|fetch\(|HomeViewModel|home-dashboard-model|coach_clients|resolveUserCapabilities/i)
    expect(shell).toContain('model: ProgressionViewModel')
  })
  it('preserves access to photos, records, measurements and advanced analysis', () => {
    expect(tab).toContain('<ProgressionV2')
    for (const section of ['<TransformationPhotos', 'checkins={wellbeingEntries}', '<AnalyticsSection']) expect(tab).toContain(section)
    expect(shell).toContain('PROGRESSION_MEASUREMENT_FIELDS')
    expect(shell).toContain('<PersonalRecordsV2')
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
