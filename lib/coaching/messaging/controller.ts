import type { StopSubscription } from './types'

export function createSubscriptionController(start: () => StopSubscription) {
  let stop: StopSubscription | null = null
  let generation = 0
  return {
    start() {
      if (stop) return
      generation += 1
      stop = start()
    },
    stop() {
      if (!stop) return
      generation += 1
      const current = stop
      stop = null
      current()
    },
    isCurrent(candidate: number) { return stop !== null && candidate === generation },
    generation() { return generation },
    isActive() { return stop !== null },
  }
}
