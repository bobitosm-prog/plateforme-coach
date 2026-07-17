import { describe, expect, it } from 'vitest'
import {
  adaptAiGeneratedProgram,
  adaptClientAssignment,
  adaptCoachTemplate,
  adaptCompletionMarker,
  adaptCustomProgram,
  adaptImportedProgram,
  adaptPersonalRecord,
  adaptScheduledSession,
  adaptWorkoutHistory,
  CORE_LEGACY_FORMATS,
  type AdapterContext,
} from '../../lib/training/adapters'
import {
  aiProgramFixture,
  clientDaysFixture,
  clientWeekdaysFixture,
  coachTemplateFixture,
  completionFixture,
  customProgramFixture,
  moovxImportFixture,
  personalRecordFixture,
  scheduledSessionFixture,
  thirdPartyImportFixture,
  workoutHistoryFixture,
} from '../fixtures/training-legacy'

const now = '2026-07-17T12:00:00.000Z'

const coachContext: AdapterContext = {
  id: 'canonical-template',
  now,
  owner: { kind: 'coach', coachId: 'coach-1' },
  coachId: 'coach-1',
  sourceId: 'template-1',
}

const clientContext: AdapterContext = {
  id: 'canonical-client',
  now,
  owner: { kind: 'client', clientId: 'client-1' },
  clientId: 'client-1',
  timezone: 'Europe/Zurich',
}

function converted<T>(result: { status: string; value?: T }): T {
  expect(result.status).toBe('converted')
  if (result.status !== 'converted' || !result.value) throw new Error('Expected converted result')
  return result.value
}

describe('legacy Training adapters', () => {
  it('keeps the eight documented core legacy formats explicit', () => {
    expect(CORE_LEGACY_FORMATS).toEqual([
      'coach-template-envelope-v1',
      'client-program-days-v1',
      'client-program-weekdays-fr-v1',
      'custom-program-days-v1',
      'moovx-xlsx-v1',
      'strong-hevy-csv-v1',
      'workout-history-v1',
      'completed-program-session-v1',
    ])
  })

  it('converts the coach template envelope with catalog references and ordered prescriptions', () => {
    const result = adaptCoachTemplate(coachTemplateFixture, coachContext)
    const program = converted(result)
    expect(program).toMatchObject({
      formatVersion: 1,
      owner: { kind: 'coach', coachId: 'coach-1' },
      kind: 'template',
      source: { legacyFormat: 'coach-template-envelope-v1', kind: 'catalog-template' },
    })
    const exercise = program.weeks[0].days[0].kind === 'training'
      ? program.weeks[0].days[0].sessions[0].blocks[0].exercises[0]
      : undefined
    expect(exercise?.exercise).toEqual({ kind: 'catalog', exerciseId: 'catalog-bench', snapshotName: 'Développé couché' })
    expect(exercise?.prescriptions).toHaveLength(2)
    expect(exercise?.prescriptions[0].target).toEqual({ kind: 'repetitions', min: 8, max: 12 })
    expect(exercise?.defaultRest).toEqual({ kind: 'fixed', seconds: 90 })
  })

  it('converts array and French-weekday client assignments without losing their legacy format', () => {
    const arrayResult = adaptClientAssignment(clientDaysFixture, { ...clientContext, id: 'assignment-array', sourceProgramId: 'template-1', coachId: 'coach-1' })
    const arrayAssignment = converted(arrayResult)
    expect(arrayResult.legacyFormat).toBe('client-program-days-v1')
    expect(arrayAssignment.assignedBy).toEqual({ kind: 'coach', coachId: 'coach-1' })
    expect(arrayAssignment.sourceProgramId).toBe('template-1')

    const weekdaysResult = adaptClientAssignment(clientWeekdaysFixture, { ...clientContext, id: 'assignment-weekdays', coachId: 'coach-1' })
    const weekdaysAssignment = converted(weekdaysResult)
    expect(weekdaysResult.legacyFormat).toBe('client-program-weekdays-fr-v1')
    expect(weekdaysAssignment.programSnapshot.weeks[0].days.map(day => day.index)).toEqual([0, 1])
    expect(weekdaysAssignment.programSnapshot.weeks[0].days[1].kind).toBe('rest')
    const firstDay = weekdaysAssignment.programSnapshot.weeks[0].days[0]
    const reference = firstDay.kind === 'training' ? firstDay.sessions[0].blocks[0].exercises[0].exercise : undefined
    expect(reference).toEqual({ kind: 'custom', customExerciseId: 'custom-row', ownerClientId: 'client-1', snapshotName: 'Row perso' })
  })

  it('converts personal and AI programs with explicit sources', () => {
    const custom = converted(adaptCustomProgram(customProgramFixture, clientContext))
    expect(custom.source).toMatchObject({ kind: 'manual', legacyFormat: 'custom-program-days-v1' })
    expect(custom.owner).toEqual({ kind: 'client', clientId: 'client-1' })

    const ai = converted(adaptAiGeneratedProgram(aiProgramFixture, { ...clientContext, id: 'ai-program' }))
    expect(ai.source).toMatchObject({ kind: 'ai', provider: 'anthropic', legacyFormat: 'ai-generated-program-v1' })
    expect(ai.name).toBe('Programme IA')
  })

  it('converts MoovX and third-party imports and reports lossy aggregation', () => {
    const moovx = adaptImportedProgram(moovxImportFixture, { ...clientContext, id: 'import-moovx' }, 'moovx-xlsx')
    expect(converted(moovx).source.provider).toBe('moovx-xlsx')
    expect(moovx.legacyFormat).toBe('moovx-xlsx-v1')

    const strong = adaptImportedProgram(thirdPartyImportFixture, { ...clientContext, id: 'import-strong' }, 'strong')
    expect(converted(strong).source.provider).toBe('strong')
    expect(strong.status === 'converted' && strong.warnings).toContainEqual(expect.objectContaining({ code: 'lossy_import' }))
  })

  it('converts calendar, execution, completion and record history', () => {
    const scheduled = converted(adaptScheduledSession(scheduledSessionFixture, { ...clientContext, id: 'scheduled-1' }))
    expect(scheduled).toMatchObject({ clientId: 'client-1', scheduledFor: '2026-07-20T18:00:00', durationSeconds: 3600 })

    const executionResult = adaptWorkoutHistory(workoutHistoryFixture, { ...clientContext, id: 'workout-1' })
    const execution = converted(executionResult)
    expect(execution.exercises).toHaveLength(2)
    expect(execution.exercises[0].sets.map(set => set.id)).toEqual(['set-1', 'set-2'])
    expect(execution.exercises[0].exercise.kind).toBe('catalog')
    expect(executionResult.status === 'converted' && executionResult.warnings).toContainEqual(expect.objectContaining({ code: 'legacy_name_reference' }))

    const completion = converted(adaptCompletionMarker(completionFixture, { ...clientContext, id: 'completion-1', coachId: 'coach-1' }))
    expect(completion).toMatchObject({ assignedProgramId: 'assignment-array', sessionIndex: 0, durationSeconds: 2700 })

    const record = converted(adaptPersonalRecord(personalRecordFixture, { ...clientContext, id: 'record-1' }))
    expect(record).toMatchObject({ kind: 'max-load', unit: 'kg', value: 82.5, previousValue: 80 })
    expect(record.exercise.kind).toBe('legacy')
  })

  it('isolates unknown formats and ambiguous prescriptions instead of inventing values', () => {
    const unknownWeekday = adaptClientAssignment({ program: { someday: { exercises: [] } } }, clientContext)
    expect(unknownWeekday).toMatchObject({ status: 'legacyUnsupported', legacyFormat: 'client-program-weekdays-fr-v1' })

    const unknownReps = adaptCustomProgram({ name: 'Ambiguous', days: [{ name: 'Day', exercises: [{ name: 'Squat', sets: 3, reps: 'beaucoup', rest: 90 }] }] }, clientContext)
    expect(unknownReps).toMatchObject({ status: 'legacyUnsupported', legacyFormat: 'custom-program-days-v1' })

    const conflictingIds = adaptCustomProgram({ name: 'Ambiguous', days: [{ name: 'Day', exercises: [{ name: 'Squat', exercise_id: 'catalog', custom_exercise_id: 'custom', sets: 3, reps: 8, rest: 90 }] }] }, clientContext)
    expect(conflictingIds).toMatchObject({ status: 'legacyUnsupported' })
  })

  it('emits structured warnings for ambiguous names and unmapped fields', () => {
    const result = adaptCustomProgram({
      name: 'Warnings',
      unexpected: 'kept only in legacy',
      days: [{ name: 'Day', exercises: [{ name: 'Squat', custom_name: 'Back squat', sets: 1, reps: 8 }] }],
    }, clientContext)
    expect(converted(result).name).toBe('Warnings')
    expect(result.status === 'converted' && result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ambiguous_field' }),
      expect.objectContaining({ code: 'default_missing' }),
      expect.objectContaining({ code: 'unmapped_field' }),
    ]))
    expect(result.status === 'converted' && result.unmappedFields).toEqual(['unexpected'])
  })

  it('keeps duration, distance and rest ranges as discriminated prescriptions', () => {
    const result = adaptCustomProgram({
      name: 'Timed and distance',
      days: [{
        name: 'Conditioning',
        exercises: [
          { name: 'Planche', sets: 2, duration_seconds: 45, rest: '30-45s' },
          { name: 'Farmer walk', sets: 1, distance_meters: 100, rest: 60 },
        ],
      }],
    }, clientContext)
    const program = converted(result)
    const day = program.weeks[0].days[0]
    if (day.kind !== 'training') throw new Error('Expected training day')
    const exercises = day.sessions[0].blocks[0].exercises
    expect(exercises[0].prescriptions[0].target).toEqual({ kind: 'duration', minSeconds: 45 })
    expect(exercises[0].defaultRest).toEqual({ kind: 'range', minSeconds: 30, maxSeconds: 45 })
    expect(exercises[1].prescriptions[0].target).toEqual({ kind: 'distance', minMeters: 100 })
  })

  it('does not mutate any input fixture', () => {
    const input = structuredClone(customProgramFixture)
    const before = structuredClone(input)
    adaptCustomProgram(input, clientContext)
    expect(input).toEqual(before)
  })
})
