import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { adaptCustomProgram } from '../../lib/training/adapters'
import {
  buildCustomProgramAdaptationEnvelope,
  compareCustomProgramShadow,
  CUSTOM_PROGRAM_CRON_SHADOW_PROVENANCE,
  isAiCustomProgramShadowCandidate,
  isCronCustomProgramShadowCandidate,
  isDiagnosticCustomProgramShadowCandidate,
  isManualCustomProgramShadowCandidate,
  isOnboardingCustomProgramShadowCandidate,
  observeActiveCronCustomProgramShadow,
  toCustomProgramShadowMetric,
} from '../../lib/training/coexistence/custom-program-shadow-read'
import {
  buildPersistedCronCustomProgramFixture,
  CRON_PROGRAM_FIXTURE_OWNER,
  cronProgramProviderOutput,
} from '../fixtures/custom-program-cron'

const source = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('custom_programs cron_auto persisted contract', () => {
  it('reproduces validated output, catalog resolution and direct persistence without calendar padding', () => {
    const fixture = buildPersistedCronCustomProgramFixture()
    const snapshot = structuredClone(fixture.row)
    const days = fixture.row.days as Array<Record<string, unknown>>

    expect(fixture.providerOutput).toEqual(cronProgramProviderOutput)
    expect(days).toHaveLength(2)
    expect(days.map(day => day.day_number)).toEqual([1, 2])
    expect(days.every(day => (
      !Object.hasOwn(day, 'weekday')
      && !Object.hasOwn(day, 'is_rest')
      && !Object.hasOwn(day, 'repos')
    ))).toBe(true)
    expect((days[0].exercises as Array<Record<string, unknown>>).map(exercise => exercise.exercise_id))
      .toEqual(['catalog-bench', 'catalog-row'])
    expect((days[1].exercises as Array<Record<string, unknown>>)[0]).toMatchObject({
      exercise_id: null,
      custom_name: 'Goblet squat',
      sets: 3,
      reps: 12,
      rest_seconds: 75,
      tempo: '2-0-2',
      technique: null,
      technique_details: '',
    })
    expect(fixture.row).toMatchObject({ source: 'cron_auto', is_active: true })
    expect(fixture.row).toEqual(snapshot)

    const fixtureSource = source('tests/fixtures/custom-program-cron.ts')
    expect(fixtureSource).not.toMatch(/normalizeProgramEditorDays|prepareLegacyProgramPayload/)
    const writer = source('app/api/training-regen/cron/route.ts')
    const persistence = writer.slice(
      writer.indexOf(".from('custom_programs')\n          .update"),
      writer.indexOf('// Repousse le prochain regen'),
    )
    expect(persistence).toContain('days: program.days || []')
    expect(persistence).toContain("source: 'cron_auto'")
    expect(persistence).toContain('is_active: true')
    expect(persistence).not.toMatch(/normalizeProgramEditorDays|prepareLegacyProgramPayload/)
  })

  it('separates client ownership from the privileged system actor and Anthropic provider', () => {
    const { row } = buildPersistedCronCustomProgramFixture()
    const envelope = buildCustomProgramAdaptationEnvelope(row, row.created_at ?? '')
    expect(envelope.status).toBe('ready')
    if (envelope.status !== 'ready') throw new Error('ready envelope expected')
    expect(envelope.context).toMatchObject({
      owner: { kind: 'client', clientId: CRON_PROGRAM_FIXTURE_OWNER },
      sourceCreatedBy: { kind: 'system' },
      sourceTrigger: 'cron',
    })
    const adapted = adaptCustomProgram(envelope.input, envelope.context)
    expect(adapted.status).toBe('converted')
    if (adapted.status !== 'converted') throw new Error('converted program expected')
    expect(adapted.value).toMatchObject({
      owner: { kind: 'client', clientId: CRON_PROGRAM_FIXTURE_OWNER },
      source: {
        kind: 'ai',
        createdBy: { kind: 'system' },
        provider: 'anthropic',
        trigger: 'cron',
        legacyFormat: 'custom-program-days-v1',
      },
    })
  })

  it('classifies cron lineage and generation-context losses as warnings', () => {
    const { row } = buildPersistedCronCustomProgramFixture()
    const before = structuredClone(row)
    const result = compareCustomProgramShadow(row)
    const codes = result.differences.map(difference => difference.code)

    expect(result.result).toBe('WARNING')
    expect(codes).toEqual(expect.arrayContaining([
      'AI_MUSCLE_PRIMARY_UNMAPPED',
      'AI_METADATA_UNMAPPED',
      'AI_PROVIDER_METADATA_UNAVAILABLE',
      'TECHNIQUE_SEMANTICS_UNMAPPED',
      'REST_DAYS_NOT_PERSISTED',
      'DAY_NUMBER_NON_AUTHORITATIVE',
      'PREVIOUS_PROGRAM_LINK_UNAVAILABLE',
      'ANTI_STAGNATION_CONTEXT_UNAVAILABLE',
      'CRON_TRIGGER_AT_NOT_PERSISTED',
    ]))
    expect(codes).not.toEqual(expect.arrayContaining([
      'OWNER_MISMATCH', 'NAME_MISMATCH', 'DAY_ORDER_MISMATCH',
      'FOCUS_MUSCLES_MISMATCH', 'EXERCISE_ORDER_MISMATCH',
      'EXERCISE_REFERENCE_MISMATCH', 'SETS_MISMATCH', 'REPS_MISMATCH',
      'REST_SECONDS_MISMATCH',
    ]))
    expect(row).toEqual(before)
  })

  it('keeps semantic ownership, naming and focus divergences critical', () => {
    const { row } = buildPersistedCronCustomProgramFixture()
    const owner = compareCustomProgramShadow(row, {
      adapter: (input, context) => {
        const adapted = adaptCustomProgram(input, context)
        if (adapted.status !== 'converted') return adapted
        return { ...adapted, value: { ...adapted.value, owner: { kind: 'client', clientId: 'other-client' } } }
      },
    })
    expect(owner).toMatchObject({
      result: 'CRITICAL_MISMATCH',
      differences: expect.arrayContaining([expect.objectContaining({ code: 'OWNER_MISMATCH' })]),
    })

    const semantics = compareCustomProgramShadow(row, {
      adapter: (input, context) => {
        const adapted = adaptCustomProgram(input, context)
        if (adapted.status !== 'converted') return adapted
        const firstDay = adapted.value.weeks[0].days[0]
        if (firstDay.kind !== 'training') return adapted
        return {
          ...adapted,
          value: {
            ...adapted.value,
            name: 'Nom divergent',
            weeks: [{
              ...adapted.value.weeks[0],
              days: [{
                ...firstDay,
                sessions: [{ ...firstDay.sessions[0], focusMuscles: ['unexpected'] }],
              }, ...adapted.value.weeks[0].days.slice(1)],
            }],
          },
        }
      },
    })
    expect(semantics).toMatchObject({
      result: 'CRITICAL_MISMATCH',
      differences: expect.arrayContaining([
        expect.objectContaining({ code: 'NAME_MISMATCH' }),
        expect.objectContaining({ code: 'FOCUS_MUSCLES_MISMATCH' }),
      ]),
    })
  })

  it('keeps malformed, ambiguous, contradictory or canonically partial programs unsupported', () => {
    const { row } = buildPersistedCronCustomProgramFixture()
    expect(compareCustomProgramShadow({ ...row, days: { monday: {} } }).result).toBe('UNSUPPORTED')
    expect(compareCustomProgramShadow({ ...row, days: [{ name: 'Empty', exercises: [] }] }).result).toBe('UNSUPPORTED')

    const ambiguousDays = structuredClone(row.days) as Array<Record<string, unknown>>
    ;(ambiguousDays[0].exercises as Array<Record<string, unknown>>)[0].reps = 'beaucoup'
    expect(compareCustomProgramShadow({ ...row, days: ambiguousDays as typeof row.days }).result).toBe('UNSUPPORTED')

    const contradictoryDays = structuredClone(row.days) as Array<Record<string, unknown>>
    ;(contradictoryDays[0].exercises as Array<Record<string, unknown>>)[0].custom_exercise_id = 'conflict'
    expect(compareCustomProgramShadow({ ...row, days: contradictoryDays as typeof row.days }).result).toBe('UNSUPPORTED')

    expect(compareCustomProgramShadow(row, {
      adapter: (input, context) => {
        const adapted = adaptCustomProgram(input, context)
        return adapted.status === 'converted'
          ? { ...adapted, value: { ...adapted.value, weeks: [] } }
          : adapted
      },
    }).result).toBe('UNSUPPORTED')
  })

  it('emits one expurgated cron metric and contains observer-side failures', () => {
    const { row } = buildPersistedCronCustomProgramFixture()
    expect(isCronCustomProgramShadowCandidate(row)).toBe(true)
    expect(isManualCustomProgramShadowCandidate(row)).toBe(false)
    expect(isAiCustomProgramShadowCandidate(row)).toBe(false)
    expect(isOnboardingCustomProgramShadowCandidate(row)).toBe(false)
    expect(isDiagnosticCustomProgramShadowCandidate(row)).toBe(false)

    const metric = toCustomProgramShadowMetric(
      compareCustomProgramShadow(row),
      1.25,
      'opaque-cron-correlation',
      CUSTOM_PROGRAM_CRON_SHADOW_PROVENANCE,
    )
    expect(metric).toMatchObject({
      provenance_bucket: 'cron-auto',
      result: 'WARNING',
      correlation_id: 'opaque-cron-correlation',
    })
    expect(Object.keys(metric).sort()).toEqual([
      'adaptation_duration_ms', 'correlation_id', 'difference_codes', 'format',
      'provenance_bucket', 'result', 'unmapped_field_count', 'warning_count',
    ])
    expect(JSON.stringify(metric)).not.toMatch(/synthetic-cron|Programme cron|Développé|Rowing|Goblet/)

    const observer = vi.fn()
    expect(() => observeActiveCronCustomProgramShadow(row, observer, {
      clock: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(12.5),
      correlationId: () => 'opaque-cron-correlation',
    })).not.toThrow()
    expect(observer).toHaveBeenCalledTimes(1)
    expect(observer).toHaveBeenCalledWith(expect.objectContaining({
      provenance_bucket: 'cron-auto',
      result: 'WARNING',
      adaptation_duration_ms: 2.5,
      correlation_id: 'opaque-cron-correlation',
    }))
    expect(JSON.stringify(observer.mock.calls)).not.toMatch(/synthetic-cron|Programme cron|Développé|Rowing|Goblet/)
    expect(() => observeActiveCronCustomProgramShadow(row, () => { throw new Error('observer failed') }))
      .not.toThrow()
    expect(() => observeActiveCronCustomProgramShadow(row, observer, {
      clock: () => { throw new Error('clock failed') },
    })).not.toThrow()
    const adaptationFailureObserver = vi.fn()
    expect(() => observeActiveCronCustomProgramShadow(row, adaptationFailureObserver, {
      adapter: () => { throw new Error('adapter failed') },
      clock: vi.fn().mockReturnValueOnce(20).mockReturnValueOnce(21),
      correlationId: () => 'opaque-adaptation-failure',
    })).not.toThrow()
    expect(adaptationFailureObserver).toHaveBeenCalledWith(expect.objectContaining({
      provenance_bucket: 'cron-auto', result: 'UNSUPPORTED',
    }))
    expect(() => observeActiveCronCustomProgramShadow(row, observer, {
      correlationId: () => { throw new Error('correlation failed') },
    })).not.toThrow()

    const repository = source('lib/repositories/training/program.ts')
    expect(repository).toContain('observeActiveCronCustomProgramShadow(data)')
    expect(repository).toContain(".eq('user_id', clientUserId).eq('is_active', true).maybeSingle()")
  })
})

describe('cron_auto writer and edit characterization', () => {
  it('uses only a generic anti-stagnation instruction without loading or linking a previous program', () => {
    const writer = source('app/api/training-regen/cron/route.ts')
    const generation = writer.slice(writer.indexOf('process: async profile'), writer.indexOf('// Deactivate old + insert new'))
    expect(generation).toContain('Varie les exercices et la structure par rapport au programme precedent')
    expect(generation).not.toContain("from('custom_programs')")
    expect(generation).not.toMatch(/previous_program|previousProgram|training_volume|workout_sessions/)
    const insertion = writer.slice(writer.indexOf(".from('custom_programs')\n          .insert"), writer.indexOf('// Repousse le prochain regen'))
    expect(insertion).not.toMatch(/previous_program|previousProgram|source_program_id/)
    expect(writer).not.toMatch(/\.upsert\(|advisory_lock|idempotency|claim_due/)
  })

  it('keeps cron_auto on inline edits, replacements, activation and scheduling', () => {
    const inlineEditor = source('app/components/tabs/training/useTrainingProgramEditor.ts')
    const saveEdit = inlineEditor.slice(inlineEditor.indexOf('async function saveEditedProgram'), inlineEditor.indexOf('return {', inlineEditor.indexOf('async function saveEditedProgram')))
    expect(saveEdit).not.toMatch(/source\s*:/)

    const exerciseLibrary = source('app/components/training/ExerciseLibrarySection.tsx')
    const replacement = exerciseLibrary.slice(exerciseLibrary.indexOf('update({ days: updated })'), exerciseLibrary.indexOf('toast.success', exerciseLibrary.indexOf('update({ days: updated })')))
    expect(replacement).not.toMatch(/source\s*:/)

    const controller = source('app/components/tabs/TrainingTabController.tsx')
    const activationAndScheduling = controller.slice(controller.indexOf('async function doActivateProgram'), controller.indexOf('async function handleStartProgram'))
    expect(activationAndScheduling).not.toMatch(/source\s*:/)
  })

  it('moves a full Program Builder edit to manual without re-inferring cron provenance', () => {
    const builder = source('app/components/training/ProgramBuilder.tsx')
    const editEffect = builder.slice(builder.indexOf('if (!editProgram) return'), builder.indexOf('async function generateAI'))
    expect(editEffect).toContain("setMode('manual')")
    expect(builder).toContain("source: aiResult ? 'ai' : 'manual'")
    expect(builder).not.toContain("source: 'cron_auto'")
  })
})
