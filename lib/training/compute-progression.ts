import { deriveProgressionDecision, parseRepetitionRange, type ProgressionHistorySet } from '../athena/progression-model'

export type PrevSessionSet = { weight: number; reps: number; completed: boolean; rir: number | null; createdAt?: string | null; sessionId?: string }
export type ProgressionStatus = 'progress' | 'hold'
export type ProgressionResult = { weight: number; reps: number; status: ProgressionStatus; action: 'increase_reps' | 'increase_load' | 'hold'; reason: string; step: number }

export function parseRepsTarget(input: unknown): number | null {
  if (input == null) return null
  return parseRepetitionRange(String(input))?.minimum ?? null
}

/** Kept for the manual weight controls; it is not a progression prescription. */
export function getIncrementForExercise(name: string): number {
  const value = name.toLowerCase()
  if (/squat|deadlift|souleve de terre|hip thrust|good morning/i.test(value)) return 5
  if (/curl|extension|lateral|kickback|fly|ecarte|front raise|rear delt|reverse fly/i.test(value)) return 1.25
  return 2.5
}

export function roundToStep(value: number, step: number): number { return Math.round(value / step) * step }

function hold(weight: number, reps: number, reason: string): ProgressionResult {
  return { weight, reps, status: 'hold', action: 'hold', reason, step: 0 }
}

/** Session adapter for Athena's canonical, repetition-first progression rule. */
export function computeProgression(prevSessions: PrevSessionSet[][], targetReps: unknown,
  options: { setsTarget?: number; now?: Date } = {}): ProgressionResult | null {
  const target = typeof targetReps === 'number' ? String(targetReps) : String(targetReps ?? '')
  const range = parseRepetitionRange(target)
  const latest = (prevSessions[0] ?? []).filter(item => item.completed)
  if (!range || latest.length === 0) return null
  const weight = latest[0].weight
  const reps = Math.min(...latest.map(item => item.reps))
  if (weight <= 0 || reps <= 0) return null
  if (!latest.every(item => Math.abs(item.weight - weight) < 0.01)) return hold(weight, reps, 'Séries à charges variables : conserve le plan prévu.')

  const now = options.now ?? new Date()
  // Missing/old dates are not evidence for an increase or a return-to-training load.
  const recent = (item: PrevSessionSet) => {
    const at = item.createdAt ? Date.parse(item.createdAt) : NaN
    return Number.isFinite(at) && at <= now.getTime() && at >= now.getTime() - 56 * 86_400_000
  }
  if (!latest.every(recent)) return null
  if (!options.setsTarget || latest.length < options.setsTarget) return hold(weight, reps, 'Séries prévues non confirmées : conserve le plan prévu.')
  const history: ProgressionHistorySet[] = prevSessions.flatMap((session, index) => session.map(item => ({
    sessionId: item.sessionId ?? `history-${index}`,
    completed: item.completed,
    sessionCompleted: true,
    weight: item.weight,
    reps: item.reps,
    rir: item.rir,
    createdAt: item.createdAt ?? '',
  })))
  const decision = deriveProgressionDecision({
    currentWeight: weight,
    currentReps: reps,
    setsCompleted: latest.length,
    setsTarget: options.setsTarget,
    targetReps: target,
    currentRirs: latest.map(item => item.rir),
    history,
    now,
  })
  if (decision.action === 'hold') return hold(weight, reps, decision.reason)
  return {
    weight: decision.suggestedWeight,
    reps: decision.suggestedReps,
    status: 'progress',
    action: decision.action,
    reason: decision.reasoning,
    step: Math.max(0, decision.suggestedWeight - weight),
  }
}
