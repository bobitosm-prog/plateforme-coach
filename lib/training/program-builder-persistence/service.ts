import { toDateStr } from '../../schedule-utils'
import { DAY_NAMES_FR } from '../../schedule-utils'
import type {
  BuilderFailure,
  BuilderLoadResult,
  BuilderRecord,
  BuilderSaveResult,
  ProgramBuilderPersistencePort,
  SaveProgramInput,
  ScheduledSessionRecord,
} from './types'

const failure = (code: BuilderFailure['code']): BuilderFailure => ({ code })

export async function loadProgramBuilderData(
  port: ProgramBuilderPersistencePort,
  ownerUserId: string,
): Promise<BuilderLoadResult> {
  const [catalog, custom, profile] = await Promise.all([
    port.listCatalogExercises(),
    port.listCustomExercises(ownerUserId),
    port.findProfileGender(ownerUserId),
  ])
  const failures = [
    ...(catalog.error ? [failure('catalog_load_failed')] : []),
    ...(custom.error ? [failure('custom_exercises_load_failed')] : []),
    ...(profile.error ? [failure('profile_load_failed')] : []),
  ]
  const successes = 3 - failures.length
  return {
    status: successes === 3 ? 'success' : successes === 0 ? 'failed' : 'partial',
    catalogExercises: catalog.error ? [] : catalog.data,
    customExercises: custom.error ? [] : custom.data,
    gender: profile.error || typeof profile.data?.gender !== 'string' ? null : profile.data.gender,
    failures,
  }
}

export async function createProgramBuilderCustomExercise(
  port: ProgramBuilderPersistencePort,
  payload: BuilderRecord,
): Promise<{ status: 'success'; exercise: BuilderRecord } | { status: 'failed'; failures: BuilderFailure[] }> {
  const result = await port.createCustomExercise(payload)
  if (result.error || !result.data) return { status: 'failed', failures: [failure('custom_exercise_save_failed')] }
  return { status: 'success', exercise: result.data }
}

export function buildCurrentWeekSchedule(
  ownerUserId: string,
  days: readonly SaveProgramInput['days'][number][],
  now: () => Date,
): { from: string; to: string; sessions: ScheduledSessionRecord[] } {
  const today = now()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const sessions: ScheduledSessionRecord[] = []
  for (let index = 0; index < 7; index += 1) {
    const day = days[index]
    if (!day || day.is_rest) continue
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    sessions.push({
      user_id: ownerUserId,
      title: day.name || day.weekday || DAY_NAMES_FR[index],
      session_type: 'custom',
      scheduled_date: toDateStr(date),
      scheduled_time: '08:00',
      duration_min: 60,
      completed: false,
    })
  }
  return { from: toDateStr(monday), to: toDateStr(sunday), sessions }
}

export async function saveProgramAndSynchronizeCalendar(
  port: ProgramBuilderPersistencePort,
  input: SaveProgramInput,
): Promise<BuilderSaveResult> {
  const save = input.editProgramId
    ? await port.updateProgram(input.editProgramId, input.payload)
    : await port.createProgram({ ...input.payload, is_active: false })
  const failures: BuilderFailure[] = save.error ? [failure('program_save_failed')] : []

  const schedule = buildCurrentWeekSchedule(input.ownerUserId, input.days, input.now)
  const deleted = await port.deletePendingSchedule(input.ownerUserId, schedule.from, schedule.to)
  if (deleted.error) failures.push(failure('calendar_delete_failed'))
  if (schedule.sessions.length === 0) {
    if (save.error) return { status: 'save_failed', scheduledCount: 0, failures }
    if (deleted.error) return { status: 'calendar_failed', scheduledCount: 0, failures }
    return { status: 'success', scheduledCount: 0, failures: [] }
  }

  const inserted = await port.createScheduledSessions(schedule.sessions)
  if (inserted.error) failures.push(failure('calendar_insert_failed'))
  if (save.error) return { status: 'save_failed', scheduledCount: inserted.error ? 0 : schedule.sessions.length, failures }
  if (failures.length) return { status: deleted.error && inserted.error ? 'calendar_failed' : 'partial', scheduledCount: inserted.error ? 0 : schedule.sessions.length, failures }
  return { status: 'success', scheduledCount: schedule.sessions.length, failures: [] }
}

export async function loadProgramExerciseVariants(
  port: ProgramBuilderPersistencePort,
  exerciseName: string,
): Promise<{ status: 'success'; variants: BuilderRecord[] } | { status: 'failed'; variants: []; failures: BuilderFailure[] }> {
  const current = await port.findVariantGroup(exerciseName)
  if (current.error) return { status: 'failed', variants: [], failures: [failure('variant_load_failed')] }
  const group = typeof current.data?.variant_group === 'string' ? current.data.variant_group : null
  const result = group
    ? await port.listVariantExercises(group, exerciseName)
    : await port.listSimilarExercises(exerciseName.split(' ').slice(0, 2).join(' '), exerciseName)
  if (result.error) return { status: 'failed', variants: [], failures: [failure('variant_load_failed')] }
  return { status: 'success', variants: result.data }
}
