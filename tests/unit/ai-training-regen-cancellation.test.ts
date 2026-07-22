import { describe, expect, it, vi } from 'vitest'

import { runTrainingRegenerationBatches } from '@/lib/training/regeneration-batch'

describe('training regeneration cancellation', () => {
  it('does not start work when already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    const process = vi.fn(async () => {})

    await runTrainingRegenerationBatches({ items: [1, 2, 3], concurrency: 3, signal: controller.signal, process })

    expect(process).not.toHaveBeenCalled()
  })

  it('keeps the current concurrency and prevents a following batch after cancellation', async () => {
    const controller = new AbortController()
    const completed: number[] = []
    const process = vi.fn(async (item: number) => {
      completed.push(item)
      if (item === 3) controller.abort()
    })

    await runTrainingRegenerationBatches({ items: [1, 2, 3, 4, 5, 6], concurrency: 3, signal: controller.signal, process })

    expect(process).toHaveBeenCalledTimes(3)
    expect(completed).toEqual([1, 2, 3])
  })

  it('does not start remaining items in a batch after a synchronous abort', async () => {
    const controller = new AbortController()
    const process = vi.fn((item: number) => {
      if (item === 1) controller.abort()
      return Promise.resolve()
    })

    await runTrainingRegenerationBatches({ items: [1, 2, 3], concurrency: 3, signal: controller.signal, process })

    expect(process).toHaveBeenCalledOnce()
    expect(process).toHaveBeenCalledWith(1)
  })

  it('rejects invalid concurrency without starting work', async () => {
    const process = vi.fn(async () => {})
    await expect(runTrainingRegenerationBatches({ items: [1], concurrency: 0, signal: new AbortController().signal, process })).rejects.toThrow(TypeError)
    expect(process).not.toHaveBeenCalled()
  })
})
