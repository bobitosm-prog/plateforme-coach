import type { AiCancellationSignal } from './types'

export interface AiCancellationController {
  readonly signal: AiCancellationSignal
  abort(): boolean
}

export function createAiCancellationController(): AiCancellationController {
  let aborted = false
  const listeners = new Set<() => void>()
  return {
    signal: {
      get aborted() { return aborted },
      subscribe(listener) {
        if (aborted) {
          listener()
          return () => undefined
        }
        listeners.add(listener)
        let subscribed = true
        return () => {
          if (!subscribed) return
          subscribed = false
          listeners.delete(listener)
        }
      },
    },
    abort() {
      if (aborted) return false
      aborted = true
      const current = [...listeners]
      listeners.clear()
      for (const listener of current) listener()
      return true
    },
  }
}
