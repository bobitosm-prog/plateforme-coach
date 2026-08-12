import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adaptCustomProgram } from '../../lib/training/adapters'
import {
  buildCustomProgramAdaptationEnvelope,
  compareCustomProgramShadow,
  CUSTOM_PROGRAM_ONBOARDING_SHADOW_PROVENANCE,
  isAiCustomProgramShadowCandidate,
  isManualCustomProgramShadowCandidate,
  isOnboardingCustomProgramShadowCandidate,
  toCustomProgramShadowMetric,
} from '../../lib/training/coexistence/custom-program-shadow-read'
import {
  buildPersistedOnboardingCustomProgramFixture,
  ONBOARDING_PROGRAM_FIXTURE_OWNER,
  onboardingProgramProviderOutput,
} from '../fixtures/custom-program-onboarding'

const source = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('custom_programs onboarding_auto persisted contract', () => {
  it('reproduces validation, catalog resolution and direct writer persistence without editor normalization', () => {
    const fixture = buildPersistedOnboardingCustomProgramFixture()
    const snapshot = structuredClone(fixture.row)
    const days = fixture.row.days as Array<Record<string, unknown>>

    expect(fixture.providerOutput).toEqual(onboardingProgramProviderOutput)
    expect(days).toHaveLength(2)
    expect(days.map(day => day.day_number)).toEqual([1, 2])
    expect(days.every(day => !Object.hasOwn(day, 'weekday') && !Object.hasOwn(day, 'is_rest'))).toBe(true)
    expect((days[0].exercises as Array<Record<string, unknown>>).map(exercise => exercise.exercise_id))
      .toEqual(['catalog-bench', 'catalog-row'])
    expect((days[1].exercises as Array<Record<string, unknown>>)[0].exercise_id).toBeNull()
    expect(fixture.row).toMatchObject({
      name: 'Programme initial synthétique',
      source: 'onboarding_auto',
      is_active: true,
    })
    expect(fixture.row).toEqual(snapshot)

    const contract = source('tests/fixtures/custom-program-onboarding.ts')
    expect(contract).not.toMatch(/normalizeProgramEditorDays|prepareLegacyProgramPayload/)

    const writer = source('app/hooks/useInitialGeneration.ts')
    const persistence = writer.slice(
      writer.indexOf("await supabase.from('custom_programs').insert({"),
      writer.indexOf('programOk = true'),
    )
    expect(persistence).toContain("days: program.days || []")
    expect(persistence).toContain("source: 'onboarding_auto'")
    expect(persistence).toContain('is_active: true')
    expect(persistence).not.toMatch(/normalizeProgramEditorDays|prepareLegacyProgramPayload/)
  })

  it('separates client ownership from system initiation and the Anthropic provider', () => {
    const { row } = buildPersistedOnboardingCustomProgramFixture()
    const envelope = buildCustomProgramAdaptationEnvelope(row, row.created_at ?? '')
    expect(envelope.status).toBe('ready')
    if (envelope.status !== 'ready') throw new Error('ready envelope expected')
    expect(envelope.context).toMatchObject({
      owner: { kind: 'client', clientId: ONBOARDING_PROGRAM_FIXTURE_OWNER },
      sourceCreatedBy: { kind: 'system' },
      sourceTrigger: 'onboarding',
    })
    const adapted = adaptCustomProgram(envelope.input, envelope.context)
    expect(adapted.status).toBe('converted')
    if (adapted.status !== 'converted') throw new Error('converted program expected')
    expect(adapted.value).toMatchObject({
      owner: { kind: 'client', clientId: ONBOARDING_PROGRAM_FIXTURE_OWNER },
      source: {
        kind: 'ai',
        createdBy: { kind: 'system' },
        provider: 'anthropic',
        trigger: 'onboarding',
        legacyFormat: 'custom-program-days-v1',
      },
    })
  })

  it('preserves order, focus and prescriptions while classifying known persistence losses as warnings', () => {
    const { row } = buildPersistedOnboardingCustomProgramFixture()
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
    ]))
    expect(codes).not.toEqual(expect.arrayContaining([
      'OWNER_MISMATCH', 'NAME_MISMATCH', 'DAY_ORDER_MISMATCH',
      'FOCUS_MUSCLES_MISMATCH', 'EXERCISE_ORDER_MISMATCH',
      'EXERCISE_REFERENCE_MISMATCH', 'SETS_MISMATCH', 'REPS_MISMATCH',
      'REST_SECONDS_MISMATCH',
    ]))
    expect(row).toEqual(before)
  })

  it('treats focus-muscle divergence as a critical semantic mismatch', () => {
    const { row } = buildPersistedOnboardingCustomProgramFixture()
    const result = compareCustomProgramShadow(row, {
      adapter: (input, context) => {
        const adapted = adaptCustomProgram(input, context)
        if (adapted.status !== 'converted') return adapted
        const firstDay = adapted.value.weeks[0].days[0]
        if (firstDay.kind !== 'training') return adapted
        return {
          ...adapted,
          value: {
            ...adapted.value,
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
    expect(result).toMatchObject({
      result: 'CRITICAL_MISMATCH',
      differences: expect.arrayContaining([
        expect.objectContaining({ code: 'FOCUS_MUSCLES_MISMATCH' }),
      ]),
    })
  })

  it('defines a distinct expurgated bucket without enabling a runtime observer', () => {
    const { row } = buildPersistedOnboardingCustomProgramFixture()
    expect(isOnboardingCustomProgramShadowCandidate(row)).toBe(true)
    expect(isManualCustomProgramShadowCandidate(row)).toBe(false)
    expect(isAiCustomProgramShadowCandidate(row)).toBe(false)

    const metric = toCustomProgramShadowMetric(
      compareCustomProgramShadow(row),
      1.25,
      'opaque-onboarding-correlation',
      CUSTOM_PROGRAM_ONBOARDING_SHADOW_PROVENANCE,
    )
    expect(metric.provenance_bucket).toBe('onboarding-auto')
    expect(Object.keys(metric).sort()).toEqual([
      'adaptation_duration_ms', 'correlation_id', 'difference_codes', 'format',
      'provenance_bucket', 'result', 'unmapped_field_count', 'warning_count',
    ])
    expect(JSON.stringify(metric)).not.toMatch(/synthetic-onboarding|Programme initial|Développé|Rowing|Goblet/)

    const repository = source('lib/repositories/training/program.ts')
    expect(repository).not.toContain('observeActiveOnboardingCustomProgramShadow')
    expect(repository).toContain('observeActiveManualCustomProgramShadow(data)')
    expect(repository).toContain('observeActiveAiCustomProgramShadow(data)')
  })
})

describe('onboarding_auto edit provenance characterization', () => {
  it('moves a full Program Builder edit to manual and never re-infers onboarding', () => {
    const builder = source('app/components/training/ProgramBuilder.tsx')
    const editEffect = builder.slice(builder.indexOf('if (!editProgram) return'), builder.indexOf('async function generateAI'))
    expect(editEffect).toContain("setMode('manual')")
    expect(builder).toContain("source: aiResult ? 'ai' : 'manual'")
    expect(builder).not.toContain("source: 'onboarding_auto'")
  })

  it('keeps onboarding_auto on inline edits, replacements and activation because those writes omit source', () => {
    const inlineEditor = source('app/components/tabs/training/useTrainingProgramEditor.ts')
    const saveEdit = inlineEditor.slice(inlineEditor.indexOf('async function saveEditedProgram'), inlineEditor.indexOf('return {', inlineEditor.indexOf('async function saveEditedProgram')))
    expect(saveEdit).toContain('update({ days: editedDays, updated_at:')
    expect(saveEdit).not.toMatch(/source\s*:/)

    const exerciseLibrary = source('app/components/training/ExerciseLibrarySection.tsx')
    const replacement = exerciseLibrary.slice(exerciseLibrary.indexOf('update({ days: updated })'), exerciseLibrary.indexOf('toast.success', exerciseLibrary.indexOf('update({ days: updated })')))
    expect(replacement).not.toMatch(/source\s*:/)

    const controller = source('app/components/tabs/TrainingTabController.tsx')
    const activation = controller.slice(controller.indexOf('async function doActivateProgram'), controller.indexOf('async function scheduleProgram'))
    expect(activation).not.toMatch(/source\s*:/)
  })
})
