import { deriveProgressionDecision, parseRepetitionRange, type ProgressionHistorySet } from '../athena/progression-model'

export type PrevSessionSet = { weight: number; reps: number; completed: boolean; rir: number | null }
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
export function computeProgression(prevSessions: PrevSessionSet[][], targetReps: unknown): ProgressionResult | null {
  const target = typeof targetReps === 'number' ? String(targetReps) : String(targetReps ?? '')
  const range = parseRepetitionRange(target)
  const latest = (prevSessions[0] ?? []).filter(item => item.completed)
  if (!range || latest.length === 0) return null
  const weight = latest[0].weight
  const reps = Math.min(...latest.map(item => item.reps))
  if (weight <= 0 || reps <= 0) return null
  if (!latest.every(item => Math.abs(item.weight - weight) < 0.01)) return hold(weight, reps, 'Séries à charges variables : conserve le plan prévu.')

  const now = new Date('2026-01-31T12:00:00.000Z')
  const history: ProgressionHistorySet[] = prevSessions.flatMap((session, index) => session.map(item => ({
    sessionId: `history-${index}`,
    completed: item.completed,
    sessionCompleted: true,
    weight: item.weight,
    reps: item.reps,
    rir: item.rir,
    createdAt: new Date(now.getTime() - index * 86_400_000).toISOString(),
  })))
  const decision = deriveProgressionDecision({
    currentWeight: weight,
    currentReps: reps,
    setsCompleted: latest.length,
    setsTarget: latest.length,
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
