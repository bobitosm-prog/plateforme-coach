export const RECOVERY_ZONES = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'core',
] as const

export type RecoveryZone = (typeof RECOVERY_ZONES)[number]
export type RecoveryStatus = 'leave_alone' | 'recovering' | 'probably_ready' | 'unknown'
export type RecoveryConfidence = 'high' | 'reduced'

export interface RecoveryExerciseMetadata {
  id: string
  muscle_group?: string | null
}

export interface RecoveryWorkoutSet {
  completed?: boolean | null
  created_at?: string | null
  exercise_id?: string | null
  exercise_name?: string | null
  rir?: number | null
}

export interface RecoveryWorkoutSession {
  completed?: boolean | null
  created_at?: string | null
  muscles_worked?: unknown
  workout_sets?: readonly RecoveryWorkoutSet[] | null
}

export interface MuscleRecovery {
  zone: RecoveryZone
  status: Exclude<RecoveryStatus, 'unknown'>
  lastWorkedAt: string
  elapsedHours: number
  window: {
    minHours: 24 | 36 | 48
    maxHours: 36 | 48 | 72
  }
  setCount: number
  exercises: readonly string[]
  confidence: RecoveryConfidence
  source: 'exercise_metadata' | 'session_fallback'
  medianRir: number | null
}

export interface RecoveryModel {
  status: RecoveryStatus
  zones: readonly MuscleRecovery[]
  generatedAt: string
}

const NORMALIZED_ZONE_MAP: Record<string, readonly RecoveryZone[]> = {
  pectoraux: ['chest'],
  poitrine: ['chest'],
  chest: ['chest'],
  dos: ['back'],
  back: ['back'],
  lats: ['back'],
  epaules: ['shoulders'],
  shoulders: ['shoulders'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  quadriceps: ['quadriceps'],
  quads: ['quadriceps'],
  'ischio-jambiers': ['hamstrings'],
  ischiojambiers: ['hamstrings'],
  hamstrings: ['hamstrings'],
  fessiers: ['glutes'],
  glutes: ['glutes'],
  mollets: ['calves'],
  calves: ['calves'],
  abdos: ['core'],
  abdominaux: ['core'],
  abs: ['core'],
  core: ['core'],
  bras: ['biceps', 'triceps'],
  arms: ['biceps', 'triceps'],
  jambes: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
  legs: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
  'corps entier': RECOVERY_ZONES,
  'full body': RECOVERY_ZONES,
  fullbody: RECOVERY_ZONES,
}

interface ZoneCandidate {
  zone: RecoveryZone
  lastWorkedAt: string
  timestampMs: number
  setCount: number
  exercises: string[]
  rirs: Array<number | null>
  confidence: RecoveryConfidence
  source: MuscleRecovery['source']
}

function normalizeMuscleGroup(value: string): readonly RecoveryZone[] {
  const normalized = value.trim().toLocaleLowerCase('fr-CH').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return NORMALIZED_ZONE_MAP[normalized] ?? []
}

function parseMusclesWorked(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    // Legacy rows can contain a comma-separated value rather than JSON.
  }
  return trimmed.split(',').map(item => item.trim()).filter(Boolean)
}

function validTimestamp(value: string | null | undefined): { iso: string; ms: number } | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? { iso: new Date(ms).toISOString(), ms } : null
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function recoveryWindow(setCount: number): MuscleRecovery['window'] {
  if (setCount <= 4) return { minHours: 24, maxHours: 36 }
  if (setCount <= 8) return { minHours: 36, maxHours: 48 }
  return { minHours: 48, maxHours: 72 }
}

function statusFor(
  elapsedHours: number,
  window: MuscleRecovery['window'],
  medianRir: number | null,
  confidence: RecoveryConfidence,
): MuscleRecovery['status'] {
  if (elapsedHours < window.minHours) return 'leave_alone'
  const useUpperBound = confidence === 'reduced' || medianRir == null || medianRir <= 1
  if (useUpperBound && elapsedHours < window.maxHours) return 'recovering'
  return 'probably_ready'
}

function candidateFromPrimarySets(
  session: RecoveryWorkoutSession,
  exercisesById: ReadonlyMap<string, RecoveryExerciseMetadata>,
): ZoneCandidate[] {
  const byZone = new Map<RecoveryZone, ZoneCandidate>()
  const sessionTimestamp = validTimestamp(session.created_at)

  for (const set of session.workout_sets ?? []) {
    if (set.completed !== true || !set.exercise_id) continue
    const exercise = exercisesById.get(set.exercise_id)
    if (!exercise?.muscle_group) continue
    const setTimestamp = validTimestamp(set.created_at) ?? sessionTimestamp
    if (!setTimestamp) continue
    const rir = typeof set.rir === 'number' && Number.isFinite(set.rir) ? set.rir : null

    for (const zone of normalizeMuscleGroup(exercise.muscle_group)) {
      const existing = byZone.get(zone)
      if (!existing) {
        byZone.set(zone, {
          zone,
          lastWorkedAt: setTimestamp.iso,
          timestampMs: setTimestamp.ms,
          setCount: 1,
          exercises: set.exercise_name?.trim() ? [set.exercise_name.trim()] : [],
          rirs: [rir],
          confidence: rir == null ? 'reduced' : 'high',
          source: 'exercise_metadata',
        })
        continue
      }
      existing.setCount += 1
      existing.rirs.push(rir)
      if (rir == null) existing.confidence = 'reduced'
      const name = set.exercise_name?.trim()
      if (name && !existing.exercises.includes(name)) existing.exercises.push(name)
      if (setTimestamp.ms > existing.timestampMs) {
        existing.timestampMs = setTimestamp.ms
        existing.lastWorkedAt = setTimestamp.iso
      }
    }
  }

  return [...byZone.values()]
}

function candidatesFromFallback(session: RecoveryWorkoutSession): ZoneCandidate[] {
  const timestamp = validTimestamp(session.created_at)
  if (!timestamp) return []
  const zones = new Set(parseMusclesWorked(session.muscles_worked).flatMap(normalizeMuscleGroup))
  return [...zones].map(zone => ({
    zone,
    lastWorkedAt: timestamp.iso,
    timestampMs: timestamp.ms,
    setCount: 0,
    exercises: [],
    rirs: [],
    confidence: 'reduced',
    source: 'session_fallback',
  }))
}

/**
 * Builds an indicative, non-medical recovery view from completed workouts only.
 * The most recent solicitation owns each zone; statuses are never averaged.
 */
export function buildRecoveryModel({
  sessions,
  exercises,
  now = new Date(),
}: {
  sessions: readonly RecoveryWorkoutSession[]
  exercises: readonly RecoveryExerciseMetadata[]
  now?: Date
}): RecoveryModel {
  const exercisesById = new Map(exercises.map(exercise => [exercise.id, exercise]))
  const latestByZone = new Map<RecoveryZone, ZoneCandidate>()

  for (const session of sessions) {
    if (session.completed !== true) continue
    const primary = candidateFromPrimarySets(session, exercisesById)
    const candidates = primary.length > 0 ? primary : candidatesFromFallback(session)
    for (const candidate of candidates) {
      const previous = latestByZone.get(candidate.zone)
      if (!previous || candidate.timestampMs > previous.timestampMs) {
        latestByZone.set(candidate.zone, candidate)
      }
    }
  }

  const nowMs = Number.isFinite(now.getTime()) ? now.getTime() : Date.now()
  const zones = RECOVERY_ZONES.flatMap(zone => {
    const candidate = latestByZone.get(zone)
    if (!candidate) return []
    const elapsedHours = Math.max(0, (nowMs - candidate.timestampMs) / 3_600_000)
    const numericRirs = candidate.rirs.filter((rir): rir is number => rir != null)
    const medianRir = median(numericRirs)
    const window = candidate.source === 'session_fallback'
      ? { minHours: 36 as const, maxHours: 48 as const }
      : recoveryWindow(candidate.setCount)
    const confidence = candidate.timestampMs > nowMs ? 'reduced' : candidate.confidence
    return [{
      zone,
      status: statusFor(elapsedHours, window, medianRir, confidence),
      lastWorkedAt: candidate.lastWorkedAt,
      elapsedHours,
      window,
      setCount: candidate.setCount,
      exercises: candidate.exercises,
      confidence,
      source: candidate.source,
      medianRir,
    } satisfies MuscleRecovery]
  })

  const statusPriority: Record<MuscleRecovery['status'], number> = {
    leave_alone: 0,
    recovering: 1,
    probably_ready: 2,
  }
  const status = zones.length === 0
    ? 'unknown'
    : zones.reduce<MuscleRecovery['status']>((mostRestrictive, zone) => (
        statusPriority[zone.status] < statusPriority[mostRestrictive] ? zone.status : mostRestrictive
      ), 'probably_ready')

  return { status, zones, generatedAt: new Date(nowMs).toISOString() }
}
