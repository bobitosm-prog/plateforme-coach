const DAY_MS = 86_400_000
const HISTORY_WINDOW_DAYS = 56

export interface ProgressionHistorySet {
  sessionId: string
  completed: boolean
  sessionCompleted: boolean
  weight: number
  reps: number
  rir: number | null
  createdAt: string
}

export interface ProgressionModelInput {
  currentWeight: number
  currentReps: number
  setsCompleted: number
  setsTarget: number
  targetReps: string | null
  currentRirs: readonly (number | null)[]
  history: readonly ProgressionHistorySet[]
  now?: Date
}

export type ProgressionDecision =
  | { action: 'hold'; reason: 'invalid_input' | 'target_range_missing' | 'near_failure' | 'insufficient_repeated_exposures' }
  | {
      action: 'increase_reps' | 'increase_load'
      suggestedWeight: number
      suggestedReps: number
      confidence: 'standard' | 'reduced'
      evidenceSessions: number
      reasoning: string
    }

export interface RepetitionRange {
  minimum: number
  maximum: number
}

export function parseRepetitionRange(value: string | null): RepetitionRange | null {
  if (!value) return null
  const match = value.trim().match(/^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?$/)
  if (!match) return null
  const first = Number(match[1])
  const second = match[2] ? Number(match[2]) : first
  const minimum = Math.min(first, second)
  const maximum = Math.max(first, second)
  return minimum >= 1 && maximum <= 30 ? { minimum, maximum } : null
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function validRirs(values: readonly (number | null)[]): number[] {
  return values.flatMap(value => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 4 ? [value] : []
  ))
}

function successfulExposureCount(input: ProgressionModelInput, upperReps: number, now: Date): number {
  const lowerBound = now.getTime() - HISTORY_WINDOW_DAYS * DAY_MS
  const sessions = new Map<string, ProgressionHistorySet[]>()
  for (const set of input.history) {
    const timestamp = Date.parse(set.createdAt)
    if (
      !set.completed
      || !set.sessionCompleted
      || !Number.isFinite(timestamp)
      || timestamp < lowerBound
      || timestamp > now.getTime()
    ) continue
    const rows = sessions.get(set.sessionId) ?? []
    rows.push(set)
    sessions.set(set.sessionId, rows)
  }

  return [...sessions.values()].filter(sets => (
    sets.length >= input.setsTarget
    && sets.every(set => Math.abs(set.weight - input.currentWeight) < 0.01 && set.reps >= upperReps)
  )).length
}

function nextLoad(weight: number): number {
  const rounded = Math.round(weight * 1.025 * 4) / 4
  return Math.max(rounded, weight + 0.25)
}

export function deriveProgressionDecision(input: ProgressionModelInput): ProgressionDecision {
  const now = input.now && Number.isFinite(input.now.getTime()) ? input.now : new Date()
  if (
    !Number.isFinite(input.currentWeight)
    || input.currentWeight <= 0
    || !Number.isInteger(input.currentReps)
    || input.currentReps <= 0
    || !Number.isInteger(input.setsTarget)
    || input.setsTarget <= 0
    || input.setsCompleted < input.setsTarget
  ) return { action: 'hold', reason: 'invalid_input' }

  const range = parseRepetitionRange(input.targetReps)
  if (!range) return { action: 'hold', reason: 'target_range_missing' }
  const rirValues = validRirs(input.currentRirs)
  const medianRir = median(rirValues)
  if (medianRir !== null && medianRir <= 1) return { action: 'hold', reason: 'near_failure' }

  const confidence = medianRir === null ? 'reduced' : 'standard'
  if (input.currentReps < range.maximum) {
    return {
      action: 'increase_reps',
      suggestedWeight: input.currentWeight,
      suggestedReps: Math.min(range.maximum, input.currentReps + 1),
      confidence,
      evidenceSessions: 1,
      reasoning: medianRir === null
        ? 'Ajoute une répétition à charge stable; RIR non renseigné.'
        : 'Ajoute une répétition à charge stable avant d’augmenter le poids.',
    }
  }

  const evidenceSessions = successfulExposureCount(input, range.maximum, now)
  const requiredSessions = medianRir === null ? 3 : 2
  if (evidenceSessions < requiredSessions) {
    return { action: 'hold', reason: 'insufficient_repeated_exposures' }
  }

  return {
    action: 'increase_load',
    suggestedWeight: nextLoad(input.currentWeight),
    suggestedReps: range.minimum,
    confidence,
    evidenceSessions,
    reasoning: medianRir === null
      ? `Haut de plage confirmé ${evidenceSessions} fois; petite hausse prudente, confiance réduite.`
      : `Haut de plage confirmé ${evidenceSessions} fois avec marge; petite hausse de charge.`,
  }
}
