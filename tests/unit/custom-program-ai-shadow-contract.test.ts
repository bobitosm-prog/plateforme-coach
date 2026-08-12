import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adaptCustomProgram } from '../../lib/training/adapters'
import {
  buildCustomProgramAdaptationEnvelope,
  compareCustomProgramShadow,
  CUSTOM_PROGRAM_AI_SHADOW_PROVENANCE,
  isAiCustomProgramShadowCandidate,
  isManualCustomProgramShadowCandidate,
  toCustomProgramShadowMetric,
} from '../../lib/training/coexistence/custom-program-shadow-read'
import type { PersonalProgramRow } from '../../lib/repositories/training/program'
import {
  AI_CUSTOM_PROGRAM_FIXTURE_OWNER,
  aiCustomProgramProviderOutput,
  buildPersistedAiCustomProgramFixture,
} from '../fixtures/custom-program-ai'

const source = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('custom_programs AI persisted contract', () => {
  it('traverses validated provider output, editor normalization and persistable legacy payload', () => {
    const fixture = buildPersistedAiCustomProgramFixture()
    const snapshot = structuredClone(fixture.row)

    expect(fixture.providerOutput).toEqual(aiCustomProgramProviderOutput)
    expect(fixture.providerOutput.days[0].exercises[0]).not.toHaveProperty('exercise_id')
    expect(fixture.catalogResolvedOutput.days[0].exercises.map(exercise => exercise.exercise_id))
      .toEqual(['catalog-bench', 'catalog-row'])
    expect(fixture.catalogResolvedOutput.days[1].exercises[0].exercise_id).toBeNull()
    expect(fixture.row).toMatchObject({
      user_id: AI_CUSTOM_PROGRAM_FIXTURE_OWNER,
      name: 'Programme IA synthétique',
      description: 'Fixture sans donnée utilisateur issue du contrat provider.',
      source: 'ai',
      is_active: true,
    })
    expect(fixture.row.days).toHaveLength(7)
    const persistedDays = fixture.row.days as Array<Record<string, unknown>>
    expect(persistedDays.map(day => day.weekday)).toEqual([
      'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche',
    ])
    expect(persistedDays.slice(2)).toHaveLength(5)
    expect(persistedDays.slice(2).every(day => day.is_rest === true
      && Array.isArray(day.exercises)
      && day.exercises.length === 0)).toBe(true)
    expect(fixture.row).toEqual(snapshot)
  })

  it('adapts the exact persisted shape without losing critical training semantics', () => {
    const { row } = buildPersistedAiCustomProgramFixture()
    const envelope = buildCustomProgramAdaptationEnvelope(row, row.updated_at ?? '')
    expect(envelope.status).toBe('ready')
    if (envelope.status !== 'ready') throw new Error('ready envelope expected')

    const adapted = adaptCustomProgram(envelope.input, envelope.context)
    expect(adapted.status).toBe('converted')
    if (adapted.status !== 'converted') throw new Error('converted program expected')
    expect(adapted.value).toMatchObject({
      owner: { kind: 'client', clientId: AI_CUSTOM_PROGRAM_FIXTURE_OWNER },
      name: 'Programme IA synthétique',
      description: 'Fixture sans donnée utilisateur issue du contrat provider.',
      source: { kind: 'ai', provider: 'anthropic', legacyFormat: 'custom-program-days-v1' },
    })
    expect(adapted.value.weeks[0].days).toHaveLength(7)
    expect(adapted.value.weeks[0].days.slice(2).every(day => day.kind === 'rest')).toBe(true)

    const firstDay = adapted.value.weeks[0].days[0]
    expect(firstDay.kind).toBe('training')
    if (firstDay.kind !== 'training') throw new Error('training day expected')
    expect(firstDay.sessions[0].focusMuscles).toEqual(['chest', 'back'])
    const exercises = firstDay.sessions[0].blocks[0].exercises
    expect(exercises.map(exercise => exercise.exercise)).toEqual([
      { kind: 'catalog', exerciseId: 'catalog-bench', snapshotName: 'Développé couché' },
      { kind: 'catalog', exerciseId: 'catalog-row', snapshotName: 'Rowing assis' },
    ])
    expect(exercises[0].prescriptions).toHaveLength(4)
    expect(exercises[0].prescriptions[0].target).toEqual({ kind: 'repetitions', min: 8, max: 10 })
    expect(exercises[0].defaultRest).toEqual({ kind: 'fixed', seconds: 120 })
    expect(exercises[0]).toMatchObject({
      tempo: '3-1-1',
      intensityTechnique: { kind: 'superset', details: 'Rowing assis' },
    })

    const secondDay = adapted.value.weeks[0].days[1]
    if (secondDay.kind !== 'training') throw new Error('training day expected')
    expect(secondDay.sessions[0].blocks[0].exercises[0].exercise).toEqual({
      kind: 'legacy', legacyName: 'Goblet squat', legacySource: 'custom-program-days-v1',
    })
  })

  it('uses a distinct AI bucket and keeps known AI losses as warnings', () => {
    const { row } = buildPersistedAiCustomProgramFixture()
    expect(isAiCustomProgramShadowCandidate(row)).toBe(true)
    expect(isManualCustomProgramShadowCandidate(row)).toBe(false)

    const result = compareCustomProgramShadow(row)
    expect(result.result).toBe('WARNING')
    expect(result.differences.map(difference => difference.code)).toEqual(expect.arrayContaining([
      'LEGACY_NAME_REFERENCE',
      'AI_MUSCLE_PRIMARY_UNMAPPED',
      'AI_METADATA_UNMAPPED',
      'AI_PROVIDER_METADATA_UNAVAILABLE',
      'TECHNIQUE_SEMANTICS_UNMAPPED',
    ]))
    expect(result.differences.map(difference => difference.code)).not.toContain('PROVENANCE_UNCERTAIN')
    expect(result.differences.map(difference => difference.code)).not.toEqual(expect.arrayContaining([
      'OWNER_MISMATCH', 'DAY_ORDER_MISMATCH', 'EXERCISE_ORDER_MISMATCH',
      'SETS_MISMATCH', 'REPS_MISMATCH', 'REST_SECONDS_MISMATCH',
    ]))

    const metric = toCustomProgramShadowMetric(result, 1.25, 'opaque-ai-correlation', CUSTOM_PROGRAM_AI_SHADOW_PROVENANCE)
    expect(metric.provenance_bucket).toBe('ai/program-builder')
    expect(Object.keys(metric).sort()).toEqual([
      'adaptation_duration_ms', 'correlation_id', 'difference_codes', 'format',
      'provenance_bucket', 'result', 'unmapped_field_count', 'warning_count',
    ])
    expect(JSON.stringify(metric)).not.toMatch(/synthetic-ai-client|synthetic-ai-program|Programme IA|Développé|Rowing|Goblet/)
  })

  it('keeps periodization fields as AI warnings rather than critical mismatches', () => {
    const { row } = buildPersistedAiCustomProgramFixture()
    const periodized = {
      ...row,
      phases: [{ name: 'Phase synthétique' }],
    } as PersonalProgramRow & { source: 'ai' }
    const result = compareCustomProgramShadow(periodized)
    expect(result.result).toBe('WARNING')
    expect(result.differences.map(difference => difference.code)).toEqual(expect.arrayContaining([
      'PHASES_UNMAPPED', 'UNMAPPED_FIELDS',
    ]))
  })

  it('does not mutate the AI row and leaves the manual bucket behavior available', () => {
    const { row } = buildPersistedAiCustomProgramFixture()
    const before = structuredClone(row)
    compareCustomProgramShadow(row)
    expect(row).toEqual(before)

    const manual = { ...structuredClone(row), source: 'manual' } as PersonalProgramRow & { source: 'manual' }
    expect(isManualCustomProgramShadowCandidate(manual)).toBe(true)
    expect(isAiCustomProgramShadowCandidate(manual)).toBe(false)
    expect(compareCustomProgramShadow(manual).differences.map(difference => difference.code))
      .toContain('PROVENANCE_UNCERTAIN')
    expect(toCustomProgramShadowMetric(compareCustomProgramShadow(manual), 1, 'opaque').provenance_bucket)
      .toBe('manual/editor-normalized')
  })
})

describe('custom_programs AI edit provenance characterization', () => {
  it('moves a full Program Builder edit to manual because no AI result is restored', () => {
    const builder = source('app/components/training/ProgramBuilder.tsx')
    const editEffect = builder.slice(builder.indexOf('if (!editProgram) return'), builder.indexOf('async function generateAI'))
    expect(editEffect).toContain("setMode('manual')")
    expect(editEffect).not.toContain('setAiResult(')
    expect(builder).toContain("source: aiResult ? 'ai' : 'manual'")
  })

  it('keeps source=ai for inline TrainingTab and exercise replacement writes', () => {
    const inlineEditor = source('app/components/tabs/training/useTrainingProgramEditor.ts')
    const saveEdit = inlineEditor.slice(inlineEditor.indexOf('async function saveEditedProgram'), inlineEditor.indexOf('return {', inlineEditor.indexOf('async function saveEditedProgram')))
    expect(saveEdit).toContain("update({ days: editedDays, updated_at:")
    expect(saveEdit).not.toMatch(/source\s*:/)

    const exerciseLibrary = source('app/components/training/ExerciseLibrarySection.tsx')
    const replacement = exerciseLibrary.slice(exerciseLibrary.indexOf("update({ days: updated })"), exerciseLibrary.indexOf("toast.success", exerciseLibrary.indexOf("update({ days: updated })")))
    expect(replacement).toContain("update({ days: updated })")
    expect(replacement).not.toMatch(/source\s*:/)
  })

  it('keeps the AI observer disconnected from the runtime repository', () => {
    const repository = source('lib/repositories/training/program.ts')
    expect(repository).toContain('observeActiveManualCustomProgramShadow(data)')
    expect(repository).not.toContain('isAiCustomProgramShadowCandidate')
    expect(repository).not.toContain('CUSTOM_PROGRAM_AI_SHADOW_PROVENANCE')
  })
})
