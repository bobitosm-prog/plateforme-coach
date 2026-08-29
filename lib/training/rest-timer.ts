export type RestTimerState = 'idle' | 'running' | 'finished'

export interface RestTimerSnapshot {
  state: RestTimerState
  endAt: number | null
  remainingSeconds: number
}

export function resolveRestTimer(endAtIso: string | null, now = Date.now()): RestTimerSnapshot {
  if (!endAtIso) return { state: 'idle', endAt: null, remainingSeconds: 0 }
  const endAt = new Date(endAtIso).getTime()
  if (!Number.isFinite(endAt)) return { state: 'idle', endAt: null, remainingSeconds: 0 }
  const remainingSeconds = Math.max(0, Math.ceil((endAt - now) / 1000))
  return {
    state: remainingSeconds > 0 ? 'running' : 'finished',
    endAt,
    remainingSeconds,
  }
}

export function extendRestTimerDeadline(endAt: number, seconds: number, now = Date.now()): number {
  return Math.max(endAt, now) + Math.max(0, seconds) * 1000
}
