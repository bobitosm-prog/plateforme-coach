import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { getMeasurementsState } from '@/app/components/progression-v2/BodyMeasurements'
import { getWeightHistoryState } from '@/app/components/progression-v2/WeightHistory'
import {
  buildProgressionViewModel,
  PROGRESSION_MEASUREMENT_FIELDS,
  type ProgressionViewModelInput,
} from '@/lib/progression/progression-dashboard-model'

function input(overrides: Partial<ProgressionViewModelInput> = {}): ProgressionViewModelInput {
  return {
    period: '30d',
    now: new Date('2026-08-26T12:00:00.000Z'),
    weight: {
      logs: [
        { date: '2026-08-01', poids: 81.2 },
        { date: '2026-08-26', poids: 80.4 },
      ],
      targetWeight: 78,
    },
    sessions: { rows: [] },
    records: { rows: [] },
    measurements: {
      rows: [
        { date: '2026-08-01', chest: 101, waist: 84, hips: 98, biceps: 35, thighs: 58, calves: 38 },
        { date: '2026-08-26', chest: 100, waist: 82.5, hips: 97.5, biceps: 35.5, thighs: 58.5, calves: 38.2 },
      ],
    },
    photos: { rows: [] },
    wellbeing: { rows: [] },
    ...overrides,
  }
}

describe('Progression V2 weight history', () => {
  it('preserves ready, partial, empty and error states without zero fallbacks', () => {
    expect(getWeightHistoryState(buildProgressionViewModel(input()).weight)).toBe('ready')
    expect(getWeightHistoryState(buildProgressionViewModel(input({ weight: { logs: [{ date: '2026-08-26', poids: 80 }], isTruncated: true } })).weight)).toBe('partial')
    expect(getWeightHistoryState(buildProgressionViewModel(input({ weight: { logs: [] } })).weight)).toBe('empty')
    const failed = buildProgressionViewModel(input({ weight: { logs: [], state: 'error', errorCode: 'FAILED' } })).weight
    expect(getWeightHistoryState(failed)).toBe('error')
    expect(failed.current).toBeNull()
    expect(failed.series).toEqual([])
  })

  it('switches the unified series with the selected period', () => {
    const logs = [
      { date: '2026-06-01', poids: 83 },
      { date: '2026-08-22', poids: 81 },
      { date: '2026-08-26', poids: 80 },
    ]
    expect(buildProgressionViewModel(input({ period: '7d', weight: { logs } })).weight.series).toHaveLength(2)
    expect(buildProgressionViewModel(input({ period: '90d', weight: { logs } })).weight.series).toHaveLength(3)
  })

  it('exposes truncated all history and neutral numeric delta', () => {
    const weight = buildProgressionViewModel(input({
      period: 'all',
      weight: { logs: input().weight.logs, isTruncated: true },
    })).weight
    expect(weight.period.key).toBe('all')
    expect(weight.period.isTruncated).toBe(true)
    expect(weight.period.availableFrom).toBe('2026-08-01')
    expect(weight.delta).toBe(-0.8)
  })

  it('keeps target optional without manufacturing it', () => {
    expect(buildProgressionViewModel(input()).weight.target).toBe(78)
    expect(buildProgressionViewModel(input({ weight: { logs: input().weight.logs } })).weight.target).toBeNull()
  })
})

describe('Progression V2 canonical body history', () => {
  it('uses exactly the six canonical measurement fields, including hips and calves', () => {
    expect(PROGRESSION_MEASUREMENT_FIELDS).toEqual(['chest', 'waist', 'hips', 'biceps', 'thighs', 'calves'])
    const fields = buildProgressionViewModel(input()).measurements.fields
    expect(fields.hips?.current).toBe(97.5)
    expect(fields.calves?.current).toBe(38.2)
  })

  it('computes previous value and neutral delta per field', () => {
    const waist = buildProgressionViewModel(input()).measurements.fields.waist
    expect(waist).toMatchObject({ current: 82.5, previous: 84, delta: -1.5, state: 'ready' })
  })

  it('preserves partial, empty and error states', () => {
    const partial = buildProgressionViewModel(input({ measurements: { rows: [{ date: '2026-08-26', hips: 98, calves: 38 }] } })).measurements
    const empty = buildProgressionViewModel(input({ measurements: { rows: [] } })).measurements
    const failed = buildProgressionViewModel(input({ measurements: { rows: [], state: 'error', errorCode: 'FAILED' } })).measurements
    expect(getMeasurementsState(partial)).toBe('partial')
    expect(getMeasurementsState(empty)).toBe('empty')
    expect(getMeasurementsState(failed)).toBe('error')
    expect(failed.fields).toEqual({})
  })
})

describe('Progression V2 weight/body architecture', () => {
  const weight = readFileSync('app/components/progression-v2/WeightHistory.tsx', 'utf8')
  const body = readFileSync('app/components/progression-v2/BodyMeasurements.tsx', 'utf8')
  const shell = readFileSync('app/components/progression-v2/ProgressionV2.tsx', 'utf8')
  const progressTab = readFileSync('app/components/tabs/ProgressTab.tsx', 'utf8')
  const analytics = readFileSync('app/components/AnalyticsSection.tsx', 'utf8')
  const modal = readFileSync('app/components/modals/MeasureModal.tsx', 'utf8')
  const dashboard = readFileSync('app/hooks/useClientDashboard.ts', 'utf8')

  it('keeps visual components pure and model-driven', () => {
    expect(`${weight}\n${body}`).not.toMatch(/supabase|\.from\(|fetch\(|weight_logs|body_measurements/i)
    expect(weight).toContain("type WeightModel = ProgressionViewModel['weight']")
    expect(body).toContain("type MeasurementsModel = ProgressionViewModel['measurements']")
    expect(shell).toContain('<WeightHistory weight={model.weight}')
    expect(shell).toContain('<BodyMeasurements measurements={model.measurements}')
  })

  it('removes both legacy weight charts and the legacy measurement summary only', () => {
    expect(progressTab).not.toContain('SECTION 4 — ÉVOLUTION DU POIDS')
    expect(progressTab).not.toContain('SECTION 7 — MENSURATIONS')
    expect(progressTab).toContain('showWeightChart={false}')
    expect(analytics).toContain('showWeightChart && weightHistoryFull.length > 1')
    expect(progressTab).not.toContain('setShowWeight')
    expect(progressTab).not.toContain('setShowMeasure')
  })

  it('keeps only canonical fields in the reusable measurement entry flow', () => {
    expect(modal).toContain("['waist', 'hips', 'chest', 'biceps', 'thighs', 'calves']")
    expect(modal).not.toMatch(/left_arm|right_arm|left_thigh|right_thigh|body_fat/)
  })

  it('updates weight and measurements locally without a global reload or new read', () => {
    const saveWeight = dashboard.slice(dashboard.indexOf('async function saveWeight'), dashboard.indexOf('async function uploadAvatar'))
    expect(saveWeight).toContain('setWeightHistory30')
    expect(saveWeight).toContain('setMeasurements')
    expect(saveWeight).not.toContain('fetchAll(')
    expect(saveWeight).not.toContain('.select(')
  })

  it('preserves V2 records, photos, wellbeing and advanced analytics', () => {
    expect(shell).toContain('<PersonalRecordsV2')
    for (const marker of ['TRANSFORMATION', 'MON BIEN-ÊTRE', '<AnalyticsSection']) {
      expect(progressTab).toContain(marker)
    }
  })
})

describe('Progression V2 weight/body translations', () => {
  const paths = [
    'weightHistory.title', 'weightHistory.target', 'weightHistory.add', 'weightHistory.empty',
    'measurements.title', 'measurements.add', 'measurements.fields.chest', 'measurements.fields.waist',
    'measurements.fields.hips', 'measurements.fields.biceps', 'measurements.fields.thighs', 'measurements.fields.calves',
  ]

  function atPath(value: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => (
      current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
    ), value)
  }

  it.each(['fr', 'en', 'de'])('contains all required %s messages', locale => {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as Record<string, unknown>
    for (const path of paths) expect(atPath(messages, `progress.v2.${path}`), `${locale}:${path}`).toEqual(expect.any(String))
  })
})
