import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adaptCustomProgram } from '../../lib/training/adapters'
import {
  buildCustomProgramAdaptationEnvelope,
  compareCustomProgramShadow,
  CUSTOM_PROGRAM_DIAGNOSTIC_SHADOW_PROVENANCE,
  isAiCustomProgramShadowCandidate,
  isDiagnosticCustomProgramShadowCandidate,
  isManualCustomProgramShadowCandidate,
  isOnboardingCustomProgramShadowCandidate,
  toCustomProgramShadowMetric,
} from '../../lib/training/coexistence/custom-program-shadow-read'
import {
  buildPersistedDiagnosticCustomProgramFixture,
  DIAGNOSTIC_PROGRAM_FIXTURE_OWNER,
  diagnosticProgramProviderOutput,
} from '../fixtures/custom-program-diagnostic'

const source = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('custom_programs diagnostic_auto persisted contract', () => {
  it('reproduces validated output, catalog resolution and direct persistence without editor normalization', () => {
    const fixture = buildPersistedDiagnosticCustomProgramFixture()
    const snapshot = structuredClone(fixture.row)
    const days = fixture.row.days as Array<Record<string, unknown>>

    expect(fixture.providerOutput).toEqual(diagnosticProgramProviderOutput)
    expect(days).toHaveLength(2)
    expect(days.map(day => day.day_number)).toEqual([1, 2])
    expect(days.every(day => !Object.hasOwn(day, 'weekday') && !Object.hasOwn(day, 'is_rest'))).toBe(true)
    expect((days[0].exercises as Array<Record<string, unknown>>).map(exercise => exercise.exercise_id))
      .toEqual(['catalog-bench', 'catalog-row'])
    expect((days[1].exercises as Array<Record<string, unknown>>)[0].exercise_id).toBeNull()
    expect(fixture.row).toMatchObject({
      name: 'Programme diagnostic synthétique',
      source: 'diagnostic_auto',
      is_active: true,
    })
    expect(fixture.row).toEqual(snapshot)

    const fixtureSource = source('tests/fixtures/custom-program-diagnostic.ts')
    expect(fixtureSource).not.toMatch(/normalizeProgramEditorDays|prepareLegacyProgramPayload/)
    const writer = source('app/weekly-diagnostic/[id]/WeeklyDiagnosticDetailContent.tsx')
    const persistence = writer.slice(
      writer.indexOf("await supabase\n        .from('custom_programs')\n        .update"),
      writer.indexOf('// F6.B.6', writer.indexOf("source: 'diagnostic_auto'")),
    )
    expect(persistence).toContain('days: program.days || []')
    expect(persistence).toContain("source: 'diagnostic_auto'")
    expect(persistence).toContain('is_active: true')
    expect(persistence).not.toMatch(/normalizeProgramEditorDays|prepareLegacyProgramPayload/)
  })

  it('separates client ownership and initiation from the Anthropic provider and diagnostic trigger', () => {
    const { row } = buildPersistedDiagnosticCustomProgramFixture()
    const envelope = buildCustomProgramAdaptationEnvelope(row, row.created_at ?? '')
    expect(envelope.status).toBe('ready')
    if (envelope.status !== 'ready') throw new Error('ready envelope expected')
    expect(envelope.context).toMatchObject({
      owner: { kind: 'client', clientId: DIAGNOSTIC_PROGRAM_FIXTURE_OWNER },
      sourceCreatedBy: { kind: 'client', id: DIAGNOSTIC_PROGRAM_FIXTURE_OWNER },
      sourceTrigger: 'diagnostic',
    })
    const adapted = adaptCustomProgram(envelope.input, envelope.context)
    expect(adapted.status).toBe('converted')
    if (adapted.status !== 'converted') throw new Error('converted program expected')
    expect(adapted.value).toMatchObject({
      owner: { kind: 'client', clientId: DIAGNOSTIC_PROGRAM_FIXTURE_OWNER },
      source: {
        kind: 'ai',
        createdBy: { kind: 'client', id: DIAGNOSTIC_PROGRAM_FIXTURE_OWNER },
        provider: 'anthropic',
        trigger: 'diagnostic',
        legacyFormat: 'custom-program-days-v1',
      },
    })
  })

  it('preserves semantic content and classifies missing diagnostic lineage as warnings', () => {
    const { row } = buildPersistedDiagnosticCustomProgramFixture()
    const before = structuredClone(row)
    const result = compareCustomProgramShadow(row)
    const codes = result.differences.map(difference => difference.code)

    expect(result.result).toBe('WARNING')
    expect(codes).toEqual(expect.arrayContaining([
      'LEGACY_NAME_REFERENCE',
      'AI_MUSCLE_PRIMARY_UNMAPPED',
      'AI_METADATA_UNMAPPED',
      'AI_PROVIDER_METADATA_UNAVAILABLE',
      'TECHNIQUE_SEMANTICS_UNMAPPED',
      'REST_DAYS_NOT_PERSISTED',
      'DAY_NUMBER_NON_AUTHORITATIVE',
      'DIAGNOSTIC_ID_NOT_PERSISTED',
      'VOLUME_DELTA_NOT_PERSISTED',
      'PREVIOUS_PROGRAM_LINK_UNAVAILABLE',
    ]))
    expect(codes).not.toEqual(expect.arrayContaining([
      'OWNER_MISMATCH', 'NAME_MISMATCH', 'DAY_ORDER_MISMATCH',
      'FOCUS_MUSCLES_MISMATCH', 'EXERCISE_ORDER_MISMATCH',
      'EXERCISE_REFERENCE_MISMATCH', 'SETS_MISMATCH', 'REPS_MISMATCH',
      'REST_SECONDS_MISMATCH',
    ]))
    expect(row).toEqual(before)
  })

  it('keeps malformed or contradictory programs unsupported', () => {
    const { row } = buildPersistedDiagnosticCustomProgramFixture()
    expect(compareCustomProgramShadow({ ...row, days: { lundi: {} } }).result).toBe('UNSUPPORTED')
    const days = structuredClone(row.days) as Array<Record<string, unknown>>
    const exercises = days[0].exercises as Array<Record<string, unknown>>
    exercises[0].custom_exercise_id = 'conflicting-custom-reference'
    expect(compareCustomProgramShadow({ ...row, days: days as typeof row.days }).result).toBe('UNSUPPORTED')
  })

  it('defines an expurgated diagnostic bucket without enabling a repository observer', () => {
    const { row } = buildPersistedDiagnosticCustomProgramFixture()
    expect(isDiagnosticCustomProgramShadowCandidate(row)).toBe(true)
    expect(isManualCustomProgramShadowCandidate(row)).toBe(false)
    expect(isAiCustomProgramShadowCandidate(row)).toBe(false)
    expect(isOnboardingCustomProgramShadowCandidate(row)).toBe(false)

    const metric = toCustomProgramShadowMetric(
      compareCustomProgramShadow(row),
      1.25,
      'opaque-diagnostic-correlation',
      CUSTOM_PROGRAM_DIAGNOSTIC_SHADOW_PROVENANCE,
    )
    expect(metric).toMatchObject({
      provenance_bucket: 'diagnostic-auto',
      result: 'WARNING',
      correlation_id: 'opaque-diagnostic-correlation',
    })
    expect(Object.keys(metric).sort()).toEqual([
      'adaptation_duration_ms', 'correlation_id', 'difference_codes', 'format',
      'provenance_bucket', 'result', 'unmapped_field_count', 'warning_count',
    ])
    expect(JSON.stringify(metric)).not.toMatch(/synthetic-diagnostic|Programme diagnostic|Développé|Rowing|Goblet/)

    const repository = source('lib/repositories/training/program.ts')
    expect(repository).not.toMatch(/observeActiveDiagnosticCustomProgramShadow|isDiagnosticCustomProgramShadowCandidate/)
  })
})

describe('diagnostic_auto writer and edit characterization', () => {
  it('requires an authenticated owner and an applicable volume delta before generation', () => {
    const writer = source('app/weekly-diagnostic/[id]/WeeklyDiagnosticDetailContent.tsx')
    expect(writer).toContain('supabase.auth.getSession()')
    expect(writer).toContain(".eq('user_id', session.user.id)")
    expect(writer).toContain('setUserId(session.user.id)')
    expect(writer).toContain("const volumeDeltaPct = typeof adj.training_volume_delta_pct === 'number' ? adj.training_volume_delta_pct : 0")
    expect(writer).toContain('const volumeChanged = volumeDeltaPct !== 0')
    expect(writer).toContain('if (volumeChanged) await regenProgram(volumeDeltaPct)')
    expect(writer.match(/source: 'diagnostic_auto'/g)).toHaveLength(1)
  })

  it('deactivates the current program before inserting the exact diagnostic source', () => {
    const writer = source('app/weekly-diagnostic/[id]/WeeklyDiagnosticDetailContent.tsx')
    const regeneration = writer.slice(writer.indexOf('async function regenProgram'), writer.indexOf('// ─── Loading'))
    const deactivate = regeneration.indexOf(".update({ is_active: false })")
    const insert = regeneration.indexOf(".insert({")
    expect(deactivate).toBeGreaterThan(-1)
    expect(insert).toBeGreaterThan(deactivate)
    expect(regeneration).toContain("source: 'diagnostic_auto'")
    expect(regeneration).toContain('days: program.days || []')
  })

  it('moves a full Program Builder edit to manual without re-inferring diagnostic', () => {
    const builder = source('app/components/training/ProgramBuilder.tsx')
    const editEffect = builder.slice(builder.indexOf('if (!editProgram) return'), builder.indexOf('async function generateAI'))
    expect(editEffect).toContain("setMode('manual')")
    expect(builder).toContain("source: aiResult ? 'ai' : 'manual'")
    expect(builder).not.toContain("source: 'diagnostic_auto'")
  })

  it('keeps diagnostic_auto on inline edits, replacements, activation and scheduling', () => {
    const inlineEditor = source('app/components/tabs/training/useTrainingProgramEditor.ts')
    const saveEdit = inlineEditor.slice(inlineEditor.indexOf('async function saveEditedProgram'), inlineEditor.indexOf('return {', inlineEditor.indexOf('async function saveEditedProgram')))
    expect(saveEdit).not.toMatch(/source\s*:/)

    const exerciseLibrary = source('app/components/training/ExerciseLibrarySection.tsx')
    const replacement = exerciseLibrary.slice(exerciseLibrary.indexOf('update({ days: updated })'), exerciseLibrary.indexOf('toast.success', exerciseLibrary.indexOf('update({ days: updated })')))
    expect(replacement).not.toMatch(/source\s*:/)

    const controller = source('app/components/tabs/TrainingTabController.tsx')
    const activation = controller.slice(controller.indexOf('async function doActivateProgram'), controller.indexOf('async function deactivateProgram'))
    expect(activation).not.toMatch(/source\s*:/)
  })
})
