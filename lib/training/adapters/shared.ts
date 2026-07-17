import type {
  AdapterResult,
  AdapterWarning,
  ExerciseReference,
  LegacyFormatId,
  RestPrescription,
  SetPrescription,
  SetTarget,
  TrainingDay,
  TrainingExercise,
  TrainingWeek,
} from '../model'

export type UnknownRecord = Record<string, unknown>

export const WEEKDAYS_FR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function unsupported<T>(format: LegacyFormatId, reason: string, sourceId?: string): AdapterResult<T> {
  return {
    status: 'legacyUnsupported',
    legacyFormat: format,
    reason,
    legacyReference: { format, sourceId },
  }
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

export function readString(
  record: UnknownRecord,
  keys: string[],
  path: string,
  warnings: AdapterWarning[],
): string | undefined {
  const found = keys
    .map(key => ({ key, value: record[key] }))
    .filter((entry): entry is { key: string; value: string } => typeof entry.value === 'string' && entry.value.trim() !== '')
  const distinct = [...new Set(found.map(entry => entry.value.trim()))]
  if (distinct.length > 1) {
    warnings.push({ code: 'ambiguous_field', path, detail: `Valeurs concurrentes: ${found.map(v => v.key).join(', ')}` })
  }
  return found[0]?.value.trim()
}

export function parseTarget(value: unknown): SetTarget | undefined {
  const numeric = finiteNumber(value)
  if (numeric !== undefined && Number.isInteger(numeric) && numeric > 0) {
    return { kind: 'repetitions', min: numeric, max: numeric }
  }
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toUpperCase()
  if (normalized === 'AMRAP' || normalized === 'MAX') return { kind: 'amrap' }
  const range = normalized.match(/^(\d+)\s*[-–]\s*(\d+)$/)
  if (range) {
    const min = Number(range[1])
    const max = Number(range[2])
    if (min > 0 && max >= min) return { kind: 'repetitions', min, max }
  }
  const duration = normalized.match(/^(\d+)\s*(S|SEC|SECONDES?)$/)
  if (duration) return { kind: 'duration', minSeconds: Number(duration[1]) }
  const distance = normalized.match(/^(\d+(?:\.\d+)?)\s*(M|METRES?)$/)
  if (distance) return { kind: 'distance', minMeters: Number(distance[1]) }
  return undefined
}

export function parseRest(value: unknown): RestPrescription | undefined {
  const numeric = finiteNumber(value)
  if (numeric !== undefined && numeric > 0) return { kind: 'fixed', seconds: Math.round(numeric) }
  if (value === 0 || value === '0') return { kind: 'none' }
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  const seconds = normalized.match(/^(\d+)\s*s(?:ec(?:ondes?)?)?$/)
  if (seconds) return { kind: 'fixed', seconds: Number(seconds[1]) }
  const minutes = normalized.match(/^(\d+)\s*(?:m|min|minutes?)$/)
  if (minutes) return { kind: 'fixed', seconds: Number(minutes[1]) * 60 }
  const mixed = normalized.match(/^(\d+)\s*m(?:in)?\s*(\d+)\s*s$/)
  if (mixed) return { kind: 'fixed', seconds: Number(mixed[1]) * 60 + Number(mixed[2]) }
  const range = normalized.match(/^(\d+)\s*[-–]\s*(\d+)\s*s$/)
  if (range && Number(range[2]) >= Number(range[1])) {
    return { kind: 'range', minSeconds: Number(range[1]), maxSeconds: Number(range[2]) }
  }
  return undefined
}

function exerciseReference(
  record: UnknownRecord,
  format: LegacyFormatId,
  path: string,
  warnings: AdapterWarning[],
  clientId?: string,
): ExerciseReference | undefined {
  const name = readString(record, ['exercise_name', 'custom_name', 'name', 'exerciseName'], `${path}.name`, warnings)
  if (!name) return undefined
  const catalogId = readString(record, ['exercise_id', 'exerciseId'], `${path}.exerciseId`, warnings)
  const customId = readString(record, ['custom_exercise_id', 'customExerciseId'], `${path}.customExerciseId`, warnings)
  if (catalogId && customId) {
    warnings.push({ code: 'ambiguous_field', path, detail: 'Références catalogue et custom simultanées' })
    return undefined
  }
  if (catalogId) return { kind: 'catalog', exerciseId: catalogId, snapshotName: name }
  if (customId && clientId) return { kind: 'custom', customExerciseId: customId, ownerClientId: clientId, snapshotName: name }
  warnings.push({ code: 'legacy_name_reference', path, detail: `Exercice conservé par nom: ${name}` })
  return { kind: 'legacy', legacyName: name, legacySource: format }
}

export function convertExercise(
  input: unknown,
  format: LegacyFormatId,
  path: string,
  index: number,
  warnings: AdapterWarning[],
  clientId?: string,
): { value?: TrainingExercise; error?: string } {
  if (!isRecord(input)) return { error: `${path} n'est pas un objet` }
  const reference = exerciseReference(input, format, path, warnings, clientId)
  if (!reference) return { error: `${path} ne possède pas de référence d'exercice non ambiguë` }
  const repetitions = input.reps ?? input.repetitions
  const duration = finiteNumber(input.duration ?? input.duration_seconds)
  const distance = finiteNumber(input.distance ?? input.distance_meters)
  const target = repetitions !== undefined
    ? parseTarget(repetitions)
    : duration !== undefined && duration > 0
      ? { kind: 'duration' as const, minSeconds: duration }
      : distance !== undefined && distance > 0
        ? { kind: 'distance' as const, minMeters: distance }
        : undefined
  if (!target) return { error: `${path}.reps/duration/distance est absent ou ambigu` }
  const sets = finiteNumber(input.sets ?? input.series)
  if (sets === undefined || !Number.isInteger(sets) || sets < 1 || sets > 100) {
    return { error: `${path}.sets est absent ou invalide` }
  }
  const restValue = input.rest_seconds ?? input.rest
  const rest = restValue === undefined || restValue === null ? { kind: 'none' as const } : parseRest(restValue)
  if (!rest) return { error: `${path}.rest est ambigu` }
  if (restValue === undefined || restValue === null) {
    warnings.push({ code: 'default_missing', path: `${path}.rest`, detail: 'Aucun repos legacy; aucune valeur inventée' })
  }
  const prescriptions: SetPrescription[] = Array.from({ length: sets }, (_, setIndex) => ({
    id: `${path}:set:${setIndex}`,
    index: setIndex,
    target,
    restAfter: rest,
    warmup: false,
  }))
  const technique = readString(input, ['technique'], `${path}.technique`, warnings)
  const techniqueDetails = readString(input, ['technique_details'], `${path}.technique_details`, warnings)
  if (input.phases !== undefined && input.phases !== null) {
    warnings.push({ code: 'unmapped_field', path: `${path}.phases`, detail: 'Phases exercice legacy non converties' })
  }
  return {
    value: {
      id: typeof input.id === 'string' ? input.id : `${path}:exercise:${index}`,
      index,
      exercise: reference,
      prescriptions,
      defaultRest: rest,
      tempo: typeof input.tempo === 'string' ? input.tempo : undefined,
      intensityTechnique: technique ? { kind: technique, details: techniqueDetails } : undefined,
      coachingNotes: typeof input.notes === 'string' ? input.notes : undefined,
    },
  }
}

export function convertDays(
  input: unknown[],
  format: LegacyFormatId,
  rootId: string,
  warnings: AdapterWarning[],
  clientId?: string,
  weekdayIndexes?: number[],
): { week?: TrainingWeek; error?: string } {
  if (input.length === 0) return { error: 'Le programme ne contient aucun jour' }
  const days: TrainingDay[] = []
  for (let index = 0; index < input.length; index += 1) {
    const raw = input[index]
    const path = `${rootId}:day:${index}`
    if (!isRecord(raw)) return { error: `${path} n'est pas un objet` }
    const label = readString(raw, ['name', 'day_name', 'weekday'], `${path}.label`, warnings) ?? `Jour ${index + 1}`
    const isRest = raw.is_rest === true || raw.repos === true
    const exercises = raw.exercises
    if (isRest) {
      if (Array.isArray(exercises) && exercises.length > 0) {
        warnings.push({ code: 'ambiguous_field', path, detail: 'Jour de repos contenant des exercices' })
        return { error: `${path} est ambigu` }
      }
      days.push({ id: path, index, kind: 'rest', label })
      continue
    }
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return { error: `${path} n'est ni un repos explicite ni une séance avec exercices` }
    }
    const converted: TrainingExercise[] = []
    for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
      const result = convertExercise(exercises[exerciseIndex], format, path, exerciseIndex, warnings, clientId)
      if (!result.value) return { error: result.error }
      converted.push(result.value)
    }
    const focus = Array.isArray(raw.muscle_groups)
      ? raw.muscle_groups.filter((value): value is string => typeof value === 'string')
      : typeof raw.focus === 'string'
        ? raw.focus.split(',').map(value => value.trim()).filter(Boolean)
        : []
    days.push({
      id: path,
      index,
      kind: 'training',
      label,
      preferredWeekday: weekdayIndexes?.[index],
      sessions: [{
        id: `${path}:session:0`,
        index: 0,
        name: label,
        focusMuscles: focus,
        blocks: [{ id: `${path}:block:0`, index: 0, kind: 'straight', rounds: 1, exercises: converted }],
      }],
    })
  }
  return { week: { id: `${rootId}:week:0`, index: 0, repeatCount: 1, days } }
}

export function unknownKeys(record: UnknownRecord, known: string[]): string[] {
  return Object.keys(record).filter(key => !known.includes(key)).sort()
}
