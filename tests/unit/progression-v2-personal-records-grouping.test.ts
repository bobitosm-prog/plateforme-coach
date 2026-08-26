import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  groupPersonalRecordsByMuscle,
  normalizeRecordMuscleGroup,
} from '@/app/components/progression-v2/PersonalRecordsV2'
import {
  enrichRecordsWithMuscleMetadata,
  getDistinctRecordExerciseNames,
} from '@/app/hooks/useAnalytics'
import {
  buildProgressionViewModel,
  type ProgressionRecordRow,
  type ProgressionViewModelInput,
} from '@/lib/progression/progression-dashboard-model'

function input(rows: ProgressionRecordRow[]): ProgressionViewModelInput {
  return {
    period: '30d',
    now: new Date('2026-08-26T12:00:00.000Z'),
    weight: { logs: [] },
    sessions: { rows: [] },
    records: { rows },
    measurements: { rows: [] },
    photos: { rows: [] },
    wellbeing: { rows: [] },
  }
}

const recordRows: ProgressionRecordRow[] = [
  { exercise_name: 'Bench press', record_type: 'max_weight', value: 100, unit: 'kg', achieved_at: '2026-08-24' },
  { exercise_name: 'Row', record_type: 'max_weight', value: 90, unit: 'kg', achieved_at: '2026-08-23' },
  { exercise_name: 'Mystery lift', record_type: 'max_reps', value: 20, unit: 'reps', achieved_at: '2026-08-22' },
  { exercise_name: 'Bench press', record_type: 'max_reps', value: 12, unit: 'reps', achieved_at: '2026-08-21' },
]

describe('Progression V2 personal-record metadata enrichment', () => {
  it('builds a deterministic bounded lookup input from distinct record names', () => {
    expect(getDistinctRecordExerciseNames([
      ...recordRows,
      { exercise_name: ' Row ' },
      { exercise_name: ' ' },
      { exercise_name: null },
    ])).toEqual(['Bench press', 'Mystery lift', 'Row'])
  })

  it('enriches by exact exercise name and preserves every record on missing metadata', () => {
    const enriched = enrichRecordsWithMuscleMetadata(recordRows, [
      { name: 'Bench press', muscle_group: 'Pectoraux' },
      { name: 'Row', muscle_group: 'Dos' },
      { name: 'bench press', muscle_group: 'Épaules' },
    ])

    expect(enriched).toHaveLength(recordRows.length)
    expect(enriched.map(record => record.muscle_group)).toEqual(['Pectoraux', 'Dos', null, 'Pectoraux'])
    expect(recordRows.every(record => record.muscle_group == null)).toBe(true)
  })

  it('degrades all records to missing metadata when the lookup returns no rows', () => {
    const enriched = enrichRecordsWithMuscleMetadata(recordRows, [])
    expect(enriched).toHaveLength(recordRows.length)
    expect(enriched.every(record => record.muscle_group === null)).toBe(true)
  })
})

describe('Progression V2 personal-record muscle grouping', () => {
  const enrichedRows = enrichRecordsWithMuscleMetadata(recordRows, [
    { name: 'Bench press', muscle_group: 'Pectoraux' },
    { name: 'Row', muscle_group: 'Dos' },
    { name: 'Mystery lift', muscle_group: 'Unmapped group' },
  ])
  const records = buildProgressionViewModel(input(enrichedRows)).records.items
  const groups = groupPersonalRecordsByMuscle(records)

  it('propagates metadata through the unified Progression model', () => {
    expect(records.map(record => record.muscleGroup)).toEqual(['Pectoraux', 'Dos', 'Unmapped group', 'Pectoraux'])
  })

  it('uses the shared muscle dictionary and maps missing or unknown metadata to other', () => {
    expect(normalizeRecordMuscleGroup('Pectoraux')).toBe('chest')
    expect(normalizeRecordMuscleGroup('Dos')).toBe('back')
    expect(normalizeRecordMuscleGroup('Unmapped group')).toBe('other')
    expect(normalizeRecordMuscleGroup(null)).toBe('other')
  })

  it('groups every record exactly once, omits empty groups and keeps deterministic order', () => {
    expect(groups.map(group => [group.muscleGroup, group.count])).toEqual([
      ['chest', 2],
      ['back', 1],
      ['other', 1],
    ])
    expect(groups.flatMap(group => group.records)).toHaveLength(records.length)
    expect(new Set(groups.flatMap(group => group.records)).size).toBe(records.length)
    expect(groups.every(group => group.count > 0)).toBe(true)
    expect(groups[0].records.map(record => record.recordType)).toEqual(['max_reps', 'max_weight'])
  })
})

describe('Progression V2 personal-record grouping architecture', () => {
  const hook = readFileSync('app/hooks/useAnalytics.ts', 'utf8')
  const component = readFileSync('app/components/progression-v2/PersonalRecordsV2.tsx', 'utf8')
  const model = readFileSync('lib/progression/progression-dashboard-model.ts', 'utf8')
  const styles = readFileSync('app/components/progression-v2/ProgressionV2.module.css', 'utf8')

  it('performs one exact, bounded metadata read only in the lazy analytics loader', () => {
    const lazyLoader = hook.slice(hook.indexOf('const fetchAnalyticsData'), hook.indexOf('// Home needs only'))
    const homeLoader = hook.slice(hook.indexOf('// Home needs only'), hook.indexOf('// PR detection'))

    expect(lazyLoader.match(/\.from\('exercises_db'\)/g)).toHaveLength(1)
    expect(lazyLoader).toContain(".select('name, muscle_group')")
    expect(lazyLoader).toContain(".in('name', recordExerciseNames)")
    expect(lazyLoader).toContain('.limit(recordExerciseNames.length)')
    expect(lazyLoader).not.toContain(".select('*')\n        .in('name', recordExerciseNames)")
    expect(homeLoader).not.toContain(".from('exercises_db')")
  })

  it('keeps the visual component pure and the model explicit', () => {
    expect(component).not.toMatch(/supabase|\.from\(|fetch\(/i)
    expect(model).toContain('muscleGroup: string | null')
    expect(model).toContain("muscleGroup: row.muscle_group?.trim() || null")
  })

  it('starts closed, opens one group, limits rows to three and keeps accessible controls', () => {
    expect(component.match(/useState<string \| null>\(null\)/g)).toHaveLength(2)
    expect(component).toContain('openGroup === group.muscleGroup')
    expect(component).toContain('group.records.slice(0, 3)')
    expect(component).toContain('aria-expanded={isOpen}')
    expect(component).toContain('aria-controls={contentId}')
    expect(component).toContain("t('records.showMore'")
    expect(component).toContain("t('records.collapse')")
    expect(styles).toContain(".recordGroup[data-open='true']")
  })

  it('preserves exercise, value, type and date without manufacturing history', () => {
    expect(component).toContain('{record.exerciseName}')
    expect(component).toContain('recordValue(record, locale)')
    expect(component).toContain('getRecordTypeKey(record.recordType)')
    expect(component).toContain('dateLabel(record.recordedAt, locale)')
    expect(component).not.toContain('previousValue')
    expect(component).not.toContain('record.delta')
  })

  it.each(['fr', 'en', 'de'])('provides complete grouping messages in %s', locale => {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as {
      progress: { v2: { records: Record<string, unknown> } }
    }
    expect(messages.progress.v2.records).toMatchObject({
      muscleGroupsLabel: expect.any(String),
      recordCount: expect.any(String),
      otherGroup: expect.any(String),
      showMore: expect.any(String),
      collapse: expect.any(String),
    })
  })
})
