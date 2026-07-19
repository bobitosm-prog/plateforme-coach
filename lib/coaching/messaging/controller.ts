import type { StopSubscription } from './types'
export function createSubscriptionController(start: () => StopSubscription) {
  let stop: StopSubscription | null = null
  return { start() { if (!stop) stop = start() }, stop() { const current = stop; stop = null; current?.() } }
}
