import type { AiStreamEvent } from './types'

export interface AiStreamLifecycle {
  readonly closed: boolean
  readonly partial: boolean
  accept<T>(event: AiStreamEvent<T>): { accepted: boolean; terminal: boolean }
  cancel(): { changed: boolean }
}

export function createAiStreamLifecycle(): AiStreamLifecycle {
  let closed = false
  let partial = false
  return {
    get closed() { return closed },
    get partial() { return partial },
    accept(event) {
      if (closed) return { accepted: false, terminal: true }
      if (event.type === 'text_delta' || event.type === 'structured_delta') partial = true
      const terminal = event.type === 'completed' || event.type === 'failed'
      if (terminal) closed = true
      return { accepted: true, terminal }
    },
    cancel() {
      if (closed) return { changed: false }
      closed = true
      return { changed: true }
    },
  }
}
