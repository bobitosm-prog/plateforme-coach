import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  collectProgramExerciseNames,
  combineExerciseLibraries,
  findExerciseAlternatives,
  normalizeExerciseSearchText,
  resolveAddedExercise,
  resolveExerciseLibrarySource,
  resolveFreeSessionExercise,
  resolveLegacyExerciseName,
  searchExerciseLibrary,
} from '../../lib/training/exercise-library'

const catalog = [
  { id: 'c1', name: 'Développé couché', muscle_group: 'Pectoraux', equipment: 'Barre' },
  { id: 'c2', name: 'Rowing barre', muscle_group: 'Dos', equipment: 'Barre' },
  { id: 'c3', name: 'Squat', muscle_group: 'Quadriceps', equipment: 'Barre' },
  { id: 'c4', name: 'Hip thrust', muscle_group: 'Fessiers', equipment: 'Barre' },
]

describe('Training exercise library search', () => {
  it('keeps empty-search results in stable input order', () => {
    const result = searchExerciseLibrary(catalog)
    expect(result.results.map(entry => entry.id)).toEqual(['c1', 'c2', 'c3', 'c4'])
    expect(result.unsupported).toEqual([])
  })

  it('normalizes case and canonically equivalent accents without inventing accent removal', () => {
    expect(normalizeExerciseSearchText('DÉVELOPPÉ')).toBe('développé')
    expect(searchExerciseLibrary(catalog, { search: 'DÉVELOPPÉ' }).results).toEqual([catalog[0]])
    expect(searchExerciseLibrary(catalog, { search: 'developpe' }).results).toEqual([])
    expect(searchExerciseLibrary(catalog, { search: ' développé ' }).results).toEqual([])
  })

  it('recognizes the documented legacy name variants and isolates nameless entries', () => {
    const entries = [
      { id: 'name', name: 'Principal' },
      { id: 'exercise-name', exercise_name: 'Legacy snake' },
      { id: 'custom-name', custom_name: 'Legacy custom' },
      { id: 'camel', exerciseName: 'Legacy camel' },
      { id: 'unknown', muscle_group: 'Dos' },
    ]
    expect(entries.slice(0, 4).map(resolveLegacyExerciseName)).toEqual([
      'Principal', 'Legacy snake', 'Legacy custom', 'Legacy camel',
    ])
    const result = searchExerciseLibrary(entries, { search: 'legacy' })
    expect(result.results.map(entry => entry.id)).toEqual(['exercise-name', 'custom-name', 'camel'])
    expect(result.unsupported).toEqual([entries[4]])
  })

  it('preserves alias muscle filtering for the library and exact filtering for the modal', () => {
    expect(searchExerciseLibrary(catalog, { muscle: 'Jambes' }).results.map(entry => entry.id)).toEqual(['c3', 'c4'])
    expect(searchExerciseLibrary(catalog, { muscle: 'Jambes', muscleMatch: 'exact' }).results).toEqual([])
    expect(searchExerciseLibrary(catalog, { muscle: 'Dos', muscleMatch: 'exact' }).results).toEqual([catalog[1]])
    expect(searchExerciseLibrary(catalog, { muscle: 'dos', muscleMatch: 'case-insensitive' }).results).toEqual([catalog[1]])
  })

  it('distinguishes catalog and custom entries without collapsing same-name exercises', () => {
    const combined = combineExerciseLibraries(
      [{ id: 'catalog-id', name: 'Curl', muscle_group: 'Biceps' }],
      [{ id: 'custom-id', name: 'Curl', muscle_group: 'Biceps' }],
    )
    expect(combined.map(resolveExerciseLibrarySource)).toEqual(['catalog', 'custom'])
    expect(searchExerciseLibrary(combined, { search: 'curl' }).results).toHaveLength(2)
  })

  it('returns alternatives with the same muscle in stable order and no selected duplicate', () => {
    const alternatives = findExerciseAlternatives([
      catalog[0],
      { id: 'c5', name: 'Pompes', muscle_group: 'pectoraux' },
      { id: 'c6', name: 'Écarté', muscle_group: 'Pectoraux' },
      catalog[1],
    ], catalog[0])
    expect(alternatives.map(entry => entry.id)).toEqual(['c5', 'c6'])
  })

  it('collects unique legacy program names without mutating or reordering them', () => {
    const days = [
      { exercises: [{ exercise_name: 'Squat' }, { name: 'Row' }] },
      { exercises: [{ custom_name: 'Squat' }, { exerciseName: 'Curl' }, {}] },
    ]
    const snapshot = JSON.stringify(days)
    expect(collectProgramExerciseNames(days)).toEqual(['Squat', 'Row', 'Curl'])
    expect(JSON.stringify(days)).toBe(snapshot)
  })
})

describe('Training exercise selection', () => {
  it('resolves the current free-session payload and rejects unknown selections', () => {
    expect(resolveFreeSessionExercise({
      name: 'Row', muscle_group: 'Dos', video_url: '/row.mp4', gif_url: '/row.gif',
    })).toEqual({
      exercise_name: 'Row', muscle_group: 'Dos', sets: 3, reps: 10, rest_seconds: 90,
      video_url: '/row.mp4', gif_url: '/row.gif',
    })
    expect(resolveFreeSessionExercise({ muscle_group: 'Dos' })).toBeNull()
  })

  it('resolves the modal add payload with its existing numeric fallbacks', () => {
    expect(resolveAddedExercise(
      { custom_name: 'Mobilité', muscle_group: null },
      { sets: '0', reps: '12', restSeconds: 'invalid' },
    )).toEqual({
      name: 'Mobilité', exercise_name: 'Mobilité', muscle_group: '',
      sets: 3, reps: 12, rest_seconds: 60,
    })
  })

  it('stays pure and independent from UI, persistence, and network boundaries', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'lib/training/exercise-library.ts'), 'utf8')
    expect(source).not.toMatch(/from ['"](?:react|next|@supabase)/)
    expect(source).not.toMatch(/from ['"].*app\//)
    expect(source).not.toMatch(/\b(?:fetch|supabase|localStorage)\b/)
  })
})
