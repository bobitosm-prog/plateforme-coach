import { describe, expect, it, vi } from 'vitest'
import { createDeferredDomainLoader, type DeferredDomainState } from '../../lib/coaching/dashboard/deferred-domain'

function createHarness<T>(isEmpty: (data: T) => boolean) {
  const states: DeferredDomainState<T>[] = []
  const loader = createDeferredDomainLoader({ isEmpty, onState: state => states.push(state) })
  loader.activate()
  return { loader, states }
}

describe('deferred coach dashboard domain loader', () => {
  it('coalesces rapid activation and reuses a successful result', async () => {
    let resolve!: (value: { ok: true; data: string[] }) => void
    const load = vi.fn(() => new Promise<{ ok: true; data: string[] }>(done => { resolve = done }))
    const { loader } = createHarness<string[]>(data => data.length === 0)

    const first = loader.ensure('coach-a', load)
    const duplicate = loader.ensure('coach-a', load)
    expect(load).toHaveBeenCalledTimes(1)
    resolve({ ok: true, data: ['message'] })
    await Promise.all([first, duplicate])
    await loader.ensure('coach-a', load)

    expect(load).toHaveBeenCalledTimes(1)
    expect(loader.getState()).toEqual({ status: 'success', data: ['message'] })
  })

  it('distinguishes empty and error, then permits an explicit retry', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, data: [] })
    const { loader } = createHarness<string[]>(data => data.length === 0)

    expect(await loader.ensure('coach-a', load)).toEqual({ status: 'error', data: null })
    expect(await loader.retry('coach-a', load)).toEqual({ status: 'empty', data: [] })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('ignores a stale response after coach invalidation', async () => {
    let resolveOld!: (value: { ok: true; data: string[] }) => void
    const oldLoad = () => new Promise<{ ok: true; data: string[] }>(done => { resolveOld = done })
    const { loader } = createHarness<string[]>(data => data.length === 0)
    const oldRequest = loader.ensure('coach-a', oldLoad)
    loader.invalidate()
    await loader.ensure('coach-b', async () => ({ ok: true, data: ['new'] }))
    resolveOld({ ok: true, data: ['old'] })
    await oldRequest

    expect(loader.getState()).toEqual({ status: 'success', data: ['new'] })
  })

  it('does not publish after disposal and can be reactivated for Strict Mode', async () => {
    const { loader, states } = createHarness<string[]>(data => data.length === 0)
    loader.dispose()
    await loader.ensure('coach-a', async () => ({ ok: true, data: ['ignored'] }))
    expect(states).toEqual([])

    loader.activate()
    loader.invalidate()
    await loader.ensure('coach-a', async () => ({ ok: true, data: ['visible'] }))
    expect(states.at(-1)).toEqual({ status: 'success', data: ['visible'] })
  })
})
