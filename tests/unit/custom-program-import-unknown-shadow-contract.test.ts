import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { adaptCustomProgram } from '../../lib/training/adapters'
import {
  buildCustomProgramAdaptationEnvelope,
  compareCustomProgramShadow,
  CUSTOM_PROGRAM_IMPORT_SHADOW_PROVENANCE,
  isAiCustomProgramShadowCandidate,
  isCronCustomProgramShadowCandidate,
  isDiagnosticCustomProgramShadowCandidate,
  isFreeSessionCustomProgramShadowCandidate,
  isImportCustomProgramShadowCandidate,
  isManualCustomProgramShadowCandidate,
  isOnboardingCustomProgramShadowCandidate,
  observeActiveImportCustomProgramShadow,
  toCustomProgramShadowMetric,
} from '../../lib/training/coexistence/custom-program-shadow-read'
import {
  buildPersistedImportUnknownFixture,
  IMPORT_UNKNOWN_FIXTURE_OWNER,
} from '../fixtures/custom-program-import-unknown'

const source = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('historical custom_programs import-unknown contract', () => {
  it('models only the normalized persisted row without inventing an original provider or file', () => {
    const row = buildPersistedImportUnknownFixture()
    const before = structuredClone(row)
    const serialized = JSON.stringify(row)

    expect(row).toMatchObject({
      user_id: IMPORT_UNKNOWN_FIXTURE_OWNER,
      source: 'import',
      is_active: true,
    })
    expect(row.days).toHaveLength(2)
    expect(row.days).toEqual(expect.arrayContaining([
      expect.objectContaining({ is_rest: false }),
      expect.objectContaining({ is_rest: true, exercises: [] }),
    ]))
    expect(serialized).not.toMatch(/original_file|parser_type|import_moovx|import_strong|import_hevy|provider/)
    expect(row).toEqual(before)
  })

  it('adapts historical import as client-owned import with no provider or artificial trigger', () => {
    const row = buildPersistedImportUnknownFixture()
    const envelope = buildCustomProgramAdaptationEnvelope(row, row.created_at ?? '')
    expect(envelope.status).toBe('ready')
    if (envelope.status !== 'ready') throw new Error('ready envelope expected')
    expect(envelope.context).toMatchObject({
      owner: { kind: 'client', clientId: IMPORT_UNKNOWN_FIXTURE_OWNER },
    })
    expect(envelope.context).not.toHaveProperty('sourceTrigger')
    expect(envelope.context).not.toHaveProperty('sourceCreatedBy')

    const adapted = adaptCustomProgram(envelope.input, envelope.context)
    expect(adapted.status).toBe('converted')
    if (adapted.status !== 'converted') throw new Error('converted import expected')
    expect(adapted.value).toMatchObject({
      owner: { kind: 'client', clientId: IMPORT_UNKNOWN_FIXTURE_OWNER },
      source: {
        kind: 'import',
        createdBy: { kind: 'client', id: IMPORT_UNKNOWN_FIXTURE_OWNER },
        legacyFormat: 'custom-program-days-v1',
      },
    })
    expect(adapted.value.source).not.toHaveProperty('provider')
    expect(adapted.value.source).not.toHaveProperty('trigger')
  })

  it('keeps persisted semantics and historical uncertainty as warnings', () => {
    const row = buildPersistedImportUnknownFixture()
    const before = structuredClone(row)
    const result = compareCustomProgramShadow(row)
    const codes = result.differences.map(difference => difference.code)

    expect(result.result).toBe('WARNING')
    expect(codes).toEqual(expect.arrayContaining([
      'IMPORT_SOURCE_UNKNOWN',
      'IMPORT_ORIGINAL_FILE_UNAVAILABLE',
      'LEGACY_NAME_REFERENCE',
      'IMPORT_FIELDS_UNMAPPED',
      'PHASES_UNMAPPED',
      'TECHNIQUE_SEMANTICS_UNMAPPED',
      'IMPORT_WEIGHT_UNMAPPED',
    ]))
    expect(codes).not.toEqual(expect.arrayContaining([
      'OWNER_MISMATCH', 'NAME_MISMATCH', 'DAY_ORDER_MISMATCH',
      'REST_DAY_MISMATCH', 'EXERCISE_ORDER_MISMATCH',
      'EXERCISE_REFERENCE_MISMATCH', 'SETS_MISMATCH', 'REPS_MISMATCH',
      'REST_SECONDS_MISMATCH',
    ]))
    expect(codes).not.toContain('IMPORT_SERIES_DETAIL_LOST')
    expect(row).toEqual(before)
  })

  it('does not infer MoovX, Strong, Hevy or a third-party format from normalized content', () => {
    for (const name of ['Export MoovX', 'Strong workout', 'Hevy programme', 'Programme tiers']) {
      const row = { ...buildPersistedImportUnknownFixture(), name }
      const envelope = buildCustomProgramAdaptationEnvelope(row, row.created_at ?? '')
      expect(envelope.status).toBe('ready')
      if (envelope.status !== 'ready') throw new Error('ready envelope expected')
      const adapted = adaptCustomProgram(envelope.input, envelope.context)
      expect(adapted.status).toBe('converted')
      if (adapted.status !== 'converted') throw new Error('converted import expected')
      expect(adapted.value.source).toMatchObject({ kind: 'import' })
      expect(adapted.value.source).not.toHaveProperty('provider')
    }
  })

  it('keeps ownership, root name, day/rest order, exercise order/references and prescriptions critical', () => {
    const row = buildPersistedImportUnknownFixture()
    const result = compareCustomProgramShadow(row, {
      adapter: (input, context) => {
        const adapted = adaptCustomProgram(input, context)
        if (adapted.status !== 'converted') return adapted
        const trainingDay = adapted.value.weeks[0].days[0]
        const restDay = adapted.value.weeks[0].days[1]
        if (trainingDay.kind !== 'training') return adapted
        const exercises = [...trainingDay.sessions[0].blocks[0].exercises].reverse()
        exercises[0] = {
          ...exercises[0],
          prescriptions: [{
            ...exercises[0].prescriptions[0],
            target: { kind: 'repetitions', min: 1, max: 1 },
          }],
          defaultRest: { kind: 'fixed', seconds: 1 },
        }
        return {
          ...adapted,
          value: {
            ...adapted.value,
            owner: { kind: 'client', clientId: 'other-client' },
            name: 'Nom divergent',
            weeks: [{
              ...adapted.value.weeks[0],
              days: [{
                ...trainingDay,
                sessions: [{
                  ...trainingDay.sessions[0],
                  blocks: [{ ...trainingDay.sessions[0].blocks[0], exercises }],
                }],
              }, restDay],
            }],
          },
        }
      },
    })
    expect(result.result).toBe('CRITICAL_MISMATCH')
    expect(result.differences.map(difference => difference.code)).toEqual(expect.arrayContaining([
      'OWNER_MISMATCH', 'NAME_MISMATCH', 'EXERCISE_ORDER_MISMATCH',
      'EXERCISE_REFERENCE_MISMATCH', 'SETS_MISMATCH', 'REPS_MISMATCH',
      'REST_SECONDS_MISMATCH',
    ]))

    const dayOrder = compareCustomProgramShadow(row, {
      adapter: (input, context) => {
        const adapted = adaptCustomProgram(input, context)
        if (adapted.status !== 'converted') return adapted
        return {
          ...adapted,
          value: {
            ...adapted.value,
            weeks: [{
              ...adapted.value.weeks[0],
              days: [...adapted.value.weeks[0].days].reverse(),
            }],
          },
        }
      },
    })
    expect(dayOrder.result).toBe('CRITICAL_MISMATCH')
    expect(dayOrder.differences.map(difference => difference.code)).toEqual(expect.arrayContaining([
      'DAY_ORDER_MISMATCH', 'REST_DAY_MISMATCH',
    ]))
  })

  it('keeps malformed, ambiguous, contradictory and canonically partial rows unsupported', () => {
    const row = buildPersistedImportUnknownFixture()
    expect(compareCustomProgramShadow({ ...row, days: { monday: {} } }).result).toBe('UNSUPPORTED')
    expect(compareCustomProgramShadow({ ...row, days: [{ name: 'Empty', exercises: [] }] }).result).toBe('UNSUPPORTED')

    const ambiguous = structuredClone(row.days) as Array<Record<string, unknown>>
    ;(ambiguous[0].exercises as Array<Record<string, unknown>>)[0].reps = 'beaucoup'
    expect(compareCustomProgramShadow({ ...row, days: ambiguous as typeof row.days }).result).toBe('UNSUPPORTED')

    const contradictory = structuredClone(row.days) as Array<Record<string, unknown>>
    Object.assign((contradictory[0].exercises as Array<Record<string, unknown>>)[0], {
      exercise_id: 'catalog-id', custom_exercise_id: 'custom-id',
    })
    expect(compareCustomProgramShadow({ ...row, days: contradictory as typeof row.days }).result).toBe('UNSUPPORTED')
    expect(compareCustomProgramShadow(row, {
      adapter: (input, context) => {
        const adapted = adaptCustomProgram(input, context)
        return adapted.status === 'converted'
          ? { ...adapted, value: { ...adapted.value, weeks: [] } }
          : adapted
      },
    }).result).toBe('UNSUPPORTED')
  })

  it('provides a distinct expurgated metric wired only at the existing active-program read', () => {
    const row = buildPersistedImportUnknownFixture()
    expect(isImportCustomProgramShadowCandidate(row)).toBe(true)
    expect(isManualCustomProgramShadowCandidate(row)).toBe(false)
    expect(isAiCustomProgramShadowCandidate(row)).toBe(false)
    expect(isOnboardingCustomProgramShadowCandidate(row)).toBe(false)
    expect(isDiagnosticCustomProgramShadowCandidate(row)).toBe(false)
    expect(isCronCustomProgramShadowCandidate(row)).toBe(false)
    expect(isFreeSessionCustomProgramShadowCandidate(row)).toBe(false)

    const metric = toCustomProgramShadowMetric(
      compareCustomProgramShadow(row),
      1.25,
      'opaque-import-correlation',
      CUSTOM_PROGRAM_IMPORT_SHADOW_PROVENANCE,
    )
    expect(metric).toMatchObject({
      provenance_bucket: 'import-unknown',
      result: 'WARNING',
      correlation_id: 'opaque-import-correlation',
    })
    expect(Object.keys(metric).sort()).toEqual([
      'adaptation_duration_ms', 'correlation_id', 'difference_codes', 'format',
      'provenance_bucket', 'result', 'unmapped_field_count', 'warning_count',
    ])
    expect(JSON.stringify(metric)).not.toMatch(/synthetic-import|Programme importé|Mouvement poussé|Mouvement tiré/)

    const observer = vi.fn()
    expect(() => observeActiveImportCustomProgramShadow(row, observer, {
      clock: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(12.5),
      correlationId: () => 'opaque-import-correlation',
    })).not.toThrow()
    expect(observer).toHaveBeenCalledTimes(1)
    expect(observer).toHaveBeenCalledWith(expect.objectContaining({
      provenance_bucket: 'import-unknown', adaptation_duration_ms: 2.5,
    }))
    expect(() => observeActiveImportCustomProgramShadow(row, () => { throw new Error('observer failed') }))
      .not.toThrow()
    expect(() => observeActiveImportCustomProgramShadow(row, observer, {
      clock: () => { throw new Error('clock failed') },
    })).not.toThrow()
    expect(() => observeActiveImportCustomProgramShadow(row, observer, {
      correlationId: () => { throw new Error('correlation failed') },
    })).not.toThrow()

    const adaptationFailureObserver = vi.fn()
    expect(() => observeActiveImportCustomProgramShadow(row, adaptationFailureObserver, {
      adapter: () => { throw new Error('adapter failed') },
      clock: vi.fn().mockReturnValueOnce(20).mockReturnValueOnce(21),
      correlationId: () => 'opaque-adaptation-failure',
    })).not.toThrow()
    expect(adaptationFailureObserver).toHaveBeenCalledWith(expect.objectContaining({
      provenance_bucket: 'import-unknown', result: 'UNSUPPORTED',
    }))

    const comparisonFailureObserver = vi.fn()
    expect(() => observeActiveImportCustomProgramShadow(row, comparisonFailureObserver, {
      adapter: (input, context) => {
        const adapted = adaptCustomProgram(input, context)
        if (adapted.status === 'converted') {
          Object.defineProperty(adapted.value, 'weeks', {
            get: () => { throw new Error('comparison failed') },
          })
        }
        return adapted
      },
      clock: vi.fn().mockReturnValueOnce(30).mockReturnValueOnce(31),
      correlationId: () => 'opaque-comparison-failure',
    })).not.toThrow()
    expect(comparisonFailureObserver).toHaveBeenCalledWith(expect.objectContaining({
      provenance_bucket: 'import-unknown', result: 'UNSUPPORTED',
    }))

    const repository = source('lib/repositories/training/program.ts')
    expect(repository).toContain('observeActiveImportCustomProgramShadow(data)')
    expect(repository).toContain(".eq('user_id', clientUserId).eq('is_active', true).maybeSingle()")
  })
})

describe('historical import edit and future compatibility characterization', () => {
  it('keeps import on activation, scheduling, inline edits and exercise replacement', () => {
    const controller = source('app/components/tabs/TrainingTabController.tsx')
    const activationAndScheduling = controller.slice(controller.indexOf('async function doActivateProgram'), controller.indexOf('async function handleStartProgram'))
    expect(activationAndScheduling).not.toMatch(/source\s*:/)

    const inlineEditor = source('app/components/tabs/training/useTrainingProgramEditor.ts')
    const saveEdit = inlineEditor.slice(inlineEditor.indexOf('async function saveEditedProgram'), inlineEditor.indexOf('return {', inlineEditor.indexOf('async function saveEditedProgram')))
    expect(saveEdit).not.toMatch(/source\s*:/)

    const exerciseLibrary = source('app/components/training/ExerciseLibrarySection.tsx')
    const replacement = exerciseLibrary.slice(exerciseLibrary.indexOf('update({ days: updated })'), exerciseLibrary.indexOf('toast.success', exerciseLibrary.indexOf('update({ days: updated })')))
    expect(replacement).not.toMatch(/source\s*:/)
  })

  it('moves a full Program Builder edit to manual without re-inferring import', () => {
    const builder = source('app/components/training/ProgramBuilder.tsx')
    const editEffect = builder.slice(builder.indexOf('if (!editProgram) return'), builder.indexOf('async function generateAI'))
    expect(editEffect).toContain("setMode('manual')")
    expect(builder).toContain("source: aiResult ? 'ai' : 'manual'")
    expect(builder).not.toContain("source: 'import'")
  })

  it('keeps current parser and writer coarse while reserving precise future sources for another batch', () => {
    const parser = source('lib/program-excel.ts')
    const writer = source('app/components/tabs/training/TrainingTabOverlays.tsx')
    expect(parser).toContain("source: 'import'")
    expect(writer).toContain("source: 'import'")
    expect(parser + writer).not.toMatch(/import_moovx|import_strong|import_hevy/)
  })
})
