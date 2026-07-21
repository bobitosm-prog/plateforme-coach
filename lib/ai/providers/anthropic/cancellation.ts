import type { AiCancellationSignal } from '@/lib/ai/provider'

export function abortSignalToAiCancellation(signal: AbortSignal): AiCancellationSignal {
  return {
    get aborted() { return signal.aborted },
    subscribe(listener) {
      if (signal.aborted) {
        listener()
        return () => undefined
      }
      signal.addEventListener('abort', listener, { once: true })
      return () => signal.removeEventListener('abort', listener)
    },
  }
}
