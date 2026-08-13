import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { adaptCustomProgram } from '../../lib/training/adapters'
import {
  buildCustomProgramAdaptationEnvelope,
  compareCustomProgramShadow,
  CUSTOM_PROGRAM_FREE_SESSION_SHADOW_PROVENANCE,
  isAiCustomProgramShadowCandidate,
  isCronCustomProgramShadowCandidate,
  isDiagnosticCustomProgramShadowCandidate,
  isFreeSessionCustomProgramShadowCandidate,
  isManualCustomProgramShadowCandidate,
  isOnboardingCustomProgramShadowCandidate,
  observeActiveFreeSessionCustomProgramShadow,
  toCustomProgramShadowMetric,
} from '../../lib/training/coexistence/custom-program-shadow-read'
import {
  buildPersistedFreeSessionCustomProgramFixture,
  FREE_SESSION_PROGRAM_FIXTURE_OWNER,
  freeSessionWorkoutExercises,
} from '../fixtures/custom-program-free-session'

const source = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('custom_programs free_session persisted contract', () => {
  it('reproduces the exact single-session saveAsTemplate payload without invented fields', () => {
    const fixture = buildPersistedFreeSessionCustomProgramFixture()
    const before = structuredClone(fixture)
    const [day] = fixture.insertPayload.days

    expect(fixture.insertPayload).toMatchObject({
      user_id: FREE_SESSION_PROGRAM_FIXTURE_OWNER,
      name: 'Séance libre synthétique',
      source: 'free_session',
      is_active: false,
    })
    expect(fixture.insertPayload).not.toHaveProperty('description')
    expect(fixture.insertPayload.days).toHaveLength(1)
    expect(day).toMatchObject({ name: fixture.insertPayload.name, is_rest: false })
    expect(day.exercises).toEqual([
      {
        exercise_name: freeSessionWorkoutExercises[0].name,
        muscle_group: freeSessionWorkoutExercises[0].muscle,
        sets: freeSessionWorkoutExercises[0].targetSets,
        reps: 10,
        rest_seconds: freeSessionWorkoutExercises[0].rest,
      },
      {
        exercise_name: freeSessionWorkoutExercises[1].name,
        muscle_group: freeSessionWorkoutExercises[1].muscle,
        sets: freeSessionWorkoutExercises[1].targetSets,
        reps: 10,
        rest_seconds: freeSessionWorkoutExercises[1].rest,
      },
    ])
    for (const forbidden of [
      'weekday', 'exercise_id', 'order', 'tempo', 'technique', 'phases',
      'workout_session_id', 'weight', 'rir', 'volume', 'duration',
    ]) {
      expect(JSON.stringify(fixture.insertPayload)).not.toContain(`"${forbidden}"`)
    }
    expect(fixture.row.description).toBeNull()
    expect(fixture).toEqual(before)
  })

  it('keeps client manual provenance while distinguishing the free-session trigger', () => {
    const { row, insertPayload } = buildPersistedFreeSessionCustomProgramFixture()
    const direct = adaptCustomProgram(insertPayload, {
      id: row.id,
      now: row.created_at ?? '',
      owner: { kind: 'client', clientId: FREE_SESSION_PROGRAM_FIXTURE_OWNER },
      clientId: FREE_SESSION_PROGRAM_FIXTURE_OWNER,
    })
    expect(direct.status).toBe('converted')
    if (direct.status !== 'converted') throw new Error('converted program expected')
    expect(direct.value.source).toMatchObject({
      kind: 'manual',
      createdBy: { kind: 'client', id: FREE_SESSION_PROGRAM_FIXTURE_OWNER },
      trigger: 'free_session',
    })
    expect(direct.value.source).not.toHaveProperty('provider')

    const envelope = buildCustomProgramAdaptationEnvelope(row, row.created_at ?? '')
    expect(envelope.status).toBe('ready')
    if (envelope.status !== 'ready') throw new Error('ready envelope expected')
    expect(envelope.context).toMatchObject({
      owner: { kind: 'client', clientId: FREE_SESSION_PROGRAM_FIXTURE_OWNER },
      sourceCreatedBy: { kind: 'client', id: FREE_SESSION_PROGRAM_FIXTURE_OWNER },
      sourceTrigger: 'free_session',
    })
  })

  it('classifies known single-session lineage losses as warnings, never critical mismatches', () => {
    const { row } = buildPersistedFreeSessionCustomProgramFixture()
    const before = structuredClone(row)
    const result = compareCustomProgramShadow(row)
    const codes = result.differences.map(difference => difference.code)

    expect(result.result).toBe('WARNING')
    expect(codes).toEqual(expect.arrayContaining([
      'SINGLE_SESSION_NO_WEEKLY_SCHEDULE',
      'LEGACY_NAME_REFERENCE',
      'SOURCE_WORKOUT_SESSION_LINK_UNAVAILABLE',
      'EXECUTION_DATA_NOT_PERSISTED',
      'EXERCISE_CATALOG_REFERENCE_UNAVAILABLE',
      'EXERCISE_MUSCLE_GROUP_UNMAPPED',
      'TARGET_REPS_NORMALIZED',
      'TEMPO_NOT_PERSISTED',
      'TECHNIQUE_NOT_PERSISTED',
      'PHASES_NOT_PERSISTED',
    ]))
    expect(codes).not.toEqual(expect.arrayContaining([
      'OWNER_MISMATCH', 'NAME_MISMATCH', 'DAY_ORDER_MISMATCH',
      'EXERCISE_ORDER_MISMATCH', 'EXERCISE_REFERENCE_MISMATCH',
      'SETS_MISMATCH', 'REPS_MISMATCH', 'REST_SECONDS_MISMATCH',
    ]))
    expect(row).toEqual(before)
  })

  it('keeps ownership, naming, exercise count/order, references and prescriptions critical', () => {
    const { row } = buildPersistedFreeSessionCustomProgramFixture()
    const result = compareCustomProgramShadow(row, {
      adapter: (input, context) => {
        const adapted = adaptCustomProgram(input, context)
        if (adapted.status !== 'converted') return adapted
        const day = adapted.value.weeks[0].days[0]
        if (day.kind !== 'training') return adapted
        const exercises = [...day.sessions[0].blocks[0].exercises].reverse()
        exercises[0] = {
          ...exercises[0],
          prescriptions: exercises[0].prescriptions.slice(0, 1),
          defaultRest: { kind: 'fixed', seconds: 1 },
        }
        exercises[0].prescriptions[0] = {
          ...exercises[0].prescriptions[0],
          target: { kind: 'repetitions', min: 1, max: 1 },
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
                ...day,
                sessions: [{
                  ...day.sessions[0],
                  blocks: [{ ...day.sessions[0].blocks[0], exercises }],
                }],
              }],
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

    const exerciseCountMismatch = compareCustomProgramShadow(row, {
      adapter: (input, context) => {
        const adapted = adaptCustomProgram(input, context)
        if (adapted.status !== 'converted') return adapted
        const day = adapted.value.weeks[0].days[0]
        if (day.kind !== 'training') return adapted
        return {
          ...adapted,
          value: {
            ...adapted.value,
            weeks: [{ ...adapted.value.weeks[0], days: [{
              ...day,
              sessions: [{ ...day.sessions[0], blocks: [{
                ...day.sessions[0].blocks[0],
                exercises: day.sessions[0].blocks[0].exercises.slice(0, 1),
              }] }],
            }] }],
          },
        }
      },
    })
    expect(exerciseCountMismatch).toMatchObject({
      result: 'CRITICAL_MISMATCH',
      differences: expect.arrayContaining([expect.objectContaining({ code: 'EXERCISE_ORDER_MISMATCH' })]),
    })
  })

  it('keeps malformed, ambiguous, contradictory and canonically partial forms unsupported', () => {
    const { row } = buildPersistedFreeSessionCustomProgramFixture()
    expect(compareCustomProgramShadow({ ...row, days: { monday: {} } }).result).toBe('UNSUPPORTED')
    expect(compareCustomProgramShadow({ ...row, days: [{ name: 'Invalid', exercises: {} }] }).result).toBe('UNSUPPORTED')

    const ambiguous = structuredClone(row.days) as Array<Record<string, unknown>>
    ;(ambiguous[0].exercises as Array<Record<string, unknown>>)[0].reps = 'beaucoup'
    expect(compareCustomProgramShadow({ ...row, days: ambiguous as typeof row.days }).result).toBe('UNSUPPORTED')

    const contradictory = structuredClone(row.days) as Array<Record<string, unknown>>
    Object.assign((contradictory[0].exercises as Array<Record<string, unknown>>)[0], {
      exercise_id: 'catalog-id',
      custom_exercise_id: 'custom-id',
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

  it('provides a distinct expurgated bucket wired only at the existing active-program read', () => {
    const { row } = buildPersistedFreeSessionCustomProgramFixture()
    expect(isFreeSessionCustomProgramShadowCandidate(row)).toBe(true)
    expect(isManualCustomProgramShadowCandidate(row)).toBe(false)
    expect(isAiCustomProgramShadowCandidate(row)).toBe(false)
    expect(isOnboardingCustomProgramShadowCandidate(row)).toBe(false)
    expect(isDiagnosticCustomProgramShadowCandidate(row)).toBe(false)
    expect(isCronCustomProgramShadowCandidate(row)).toBe(false)

    const metric = toCustomProgramShadowMetric(
      compareCustomProgramShadow(row),
      1.25,
      'opaque-free-session-correlation',
      CUSTOM_PROGRAM_FREE_SESSION_SHADOW_PROVENANCE,
    )
    expect(metric).toMatchObject({
      provenance_bucket: 'free-session',
      result: 'WARNING',
      correlation_id: 'opaque-free-session-correlation',
    })
    expect(Object.keys(metric).sort()).toEqual([
      'adaptation_duration_ms', 'correlation_id', 'difference_codes', 'format',
      'provenance_bucket', 'result', 'unmapped_field_count', 'warning_count',
    ])
    expect(JSON.stringify(metric)).not.toMatch(/synthetic-free-session|Séance libre|Presse|Tirage/)

    const observer = vi.fn()
    expect(() => observeActiveFreeSessionCustomProgramShadow(row, observer, {
      clock: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(12.5),
      correlationId: () => 'opaque-free-session-correlation',
    })).not.toThrow()
    expect(observer).toHaveBeenCalledTimes(1)
    expect(observer).toHaveBeenCalledWith(expect.objectContaining({
      provenance_bucket: 'free-session',
      adaptation_duration_ms: 2.5,
    }))
    expect(() => observeActiveFreeSessionCustomProgramShadow(row, () => { throw new Error('observer failed') }))
      .not.toThrow()
    expect(() => observeActiveFreeSessionCustomProgramShadow(row, observer, {
      clock: () => { throw new Error('clock failed') },
    })).not.toThrow()
    expect(() => observeActiveFreeSessionCustomProgramShadow(row, observer, {
      correlationId: () => { throw new Error('correlation failed') },
    })).not.toThrow()

    const adaptationFailureObserver = vi.fn()
    expect(() => observeActiveFreeSessionCustomProgramShadow(row, adaptationFailureObserver, {
      adapter: () => { throw new Error('adapter failed') },
      clock: vi.fn().mockReturnValueOnce(20).mockReturnValueOnce(21),
      correlationId: () => 'opaque-adaptation-failure',
    })).not.toThrow()
    expect(adaptationFailureObserver).toHaveBeenCalledWith(expect.objectContaining({
      provenance_bucket: 'free-session', result: 'UNSUPPORTED',
    }))

    const comparisonFailureObserver = vi.fn()
    expect(() => observeActiveFreeSessionCustomProgramShadow(row, comparisonFailureObserver, {
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
      provenance_bucket: 'free-session', result: 'UNSUPPORTED',
    }))

    const repository = source('lib/repositories/training/program.ts')
    expect(repository).toContain('observeActiveFreeSessionCustomProgramShadow(data)')
    expect(repository).toContain(".eq('user_id', clientUserId).eq('is_active', true).maybeSingle()")
  })
})

describe('free_session writer and edit characterization', () => {
  it('offers saveAsTemplate after a non-empty workout and persists the authenticated single-session payload', () => {
    const writer = source('app/components/WorkoutSession.tsx')
    const finish = writer.slice(writer.indexOf('const finish = () =>'), writer.indexOf('async function saveAsTemplate'))
    const save = writer.slice(writer.indexOf('async function saveAsTemplate'), writer.indexOf('function moveExercise'))

    expect(finish).toContain('if (exos.length > 0)')
    expect(finish).toContain('setShowSaveTemplate(true)')
    expect(save).toContain("user_id: (await supabase.auth.getUser()).data.user?.id")
    expect(save).toContain("source: 'free_session'")
    expect(save).toContain('is_active: false')
    expect(save).toContain('days: [{ name:')
    expect(save).toContain('is_rest: false')
    expect(save).toContain('exercise_name: e.name')
    expect(save).toContain('muscle_group: e.muscle')
    expect(save).toContain('sets: e.targetSets')
    expect(save).toContain('reps: parseInt(String(e.targetReps)) || 10')
    expect(save).toContain('rest_seconds: e.rest')
    expect(save).not.toMatch(/description:|weekday:|exercise_id:|order:|tempo:|technique:|phases:|workout_session_id:/)

    const rls = source('supabase/migrations/20260415_master_rls_fix.sql')
    expect(rls).toContain('CREATE POLICY "custom_programs_own" ON custom_programs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)')
  })

  it('characterizes the unhandled insert error and potentially misleading success UI without fixing it', () => {
    const writer = source('app/components/WorkoutSession.tsx')
    const save = writer.slice(writer.indexOf('async function saveAsTemplate'), writer.indexOf('function moveExercise'))
    expect(save).toContain("await supabase.from('custom_programs').insert({")
    expect(save).not.toMatch(/\{\s*error\s*\}|throwOnError|if\s*\(.*error/)
    expect(save.indexOf("await supabase.from('custom_programs').insert({"))
      .toBeLessThan(save.indexOf("toast.success(t('templateSaved'))"))
  })

  it('persists no source-session link or execution facts and cannot support retroactive linkage', () => {
    const writer = source('app/components/WorkoutSession.tsx')
    const save = writer.slice(writer.indexOf('async function saveAsTemplate'), writer.indexOf('function moveExercise'))
    expect(save).not.toMatch(/workout_session_id|session_id|weight|completedSets|totalVolume|duration|\brir\b/)

    const schema = source('supabase/migrations/20260404_custom_programs.sql')
    const customPrograms = schema.slice(schema.indexOf('CREATE TABLE IF NOT EXISTS custom_programs'), schema.indexOf('CREATE TABLE IF NOT EXISTS custom_exercises'))
    expect(customPrograms).not.toMatch(/workout_session_id|source_session_id/)
  })

  it('preserves free_session through inline edits, replacements, activation and scheduling', () => {
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

  it('moves a full Program Builder edit to manual without re-inferring free_session', () => {
    const builder = source('app/components/training/ProgramBuilder.tsx')
    const editEffect = builder.slice(builder.indexOf('if (!editProgram) return'), builder.indexOf('async function generateAI'))
    expect(editEffect).toContain("setMode('manual')")
    expect(builder).toContain("source: aiResult ? 'ai' : 'manual'")
    expect(builder).not.toContain("source: 'free_session'")
  })
})
