export type ErrorResetResult = 'started' | 'locked' | 'failed'

export type ErrorResetGate = {
  readonly run: (reset: () => void) => ErrorResetResult
}

export function createErrorResetGate(): ErrorResetGate {
  let locked = false

  return {
    run(reset) {
      if (locked) return 'locked'
      locked = true

      try {
        reset()
        return 'started'
      } catch {
        locked = false
        return 'failed'
      }
    },
  }
}
