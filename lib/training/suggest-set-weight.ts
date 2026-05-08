export type PrevSet = { weight: number; reps: number }
export type Target = { repsMin: number; repsMax: number }
export type Suggestion = {
  weight: number
  reason: 'progress' | 'hold' | 'missed'
} | null

export function suggestSetWeight(
  prev: PrevSet | null,
  target: Target,
  step = 2.5
): Suggestion {
  if (!prev || prev.weight <= 0) return null
  if (prev.reps >= target.repsMax) return { weight: prev.weight + step, reason: 'progress' }
  if (prev.reps >= target.repsMin) return { weight: prev.weight, reason: 'hold' }
  return { weight: prev.weight, reason: 'missed' }
}
