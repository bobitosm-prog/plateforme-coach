import { describe, expect, it, vi } from 'vitest'
import { createErrorResetGate } from '../../app/components/errors/error-reset-gate'

describe('critical error reset gate', () => {
  it('runs reset once and rejects rapid repeated actions', () => {
    const reset = vi.fn()
    const gate = createErrorResetGate()

    expect(gate.run(reset)).toBe('started')
    expect(gate.run(reset)).toBe('locked')
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('unlocks after a synchronous reset failure', () => {
    const reset = vi
      .fn<() => void>()
      .mockImplementationOnce(() => { throw new Error('synthetic') })
      .mockImplementationOnce(() => undefined)
    const gate = createErrorResetGate()

    expect(gate.run(reset)).toBe('failed')
    expect(gate.run(reset)).toBe('started')
    expect(reset).toHaveBeenCalledTimes(2)
  })

  it('starts unlocked again when the boundary remounts for a successive error', () => {
    const reset = vi.fn()
    const firstMount = createErrorResetGate()
    const secondMount = createErrorResetGate()

    expect(firstMount.run(reset)).toBe('started')
    expect(secondMount.run(reset)).toBe('started')
    expect(reset).toHaveBeenCalledTimes(2)
  })
})
