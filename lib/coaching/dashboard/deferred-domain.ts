export type DeferredDomainState<T> =
  | { status: 'idle'; data: T | null }
  | { status: 'loading'; data: T | null }
  | { status: 'success'; data: T }
  | { status: 'empty'; data: T }
  | { status: 'error'; data: T | null }

export type DeferredDomainResult<T> = { ok: true; data: T } | { ok: false }

export type DeferredDomainLoader<T> = {
  activate(): void
  ensure(key: string, load: () => Promise<DeferredDomainResult<T>>): Promise<DeferredDomainState<T>>
  retry(key: string, load: () => Promise<DeferredDomainResult<T>>): Promise<DeferredDomainState<T>>
  invalidate(): void
  dispose(): void
  getState(): DeferredDomainState<T>
}

export function createDeferredDomainLoader<T>(options: {
  isEmpty: (data: T) => boolean
  onState: (state: DeferredDomainState<T>) => void
}): DeferredDomainLoader<T> {
  let state: DeferredDomainState<T> = { status: 'idle', data: null }
  let activeKey: string | null = null
  let generation = 0
  let pending: Promise<DeferredDomainState<T>> | null = null
  let disposed = false

  const publish = (next: DeferredDomainState<T>) => {
    state = next
    if (!disposed) options.onState(next)
    return next
  }

  const run = (key: string, load: () => Promise<DeferredDomainResult<T>>, force: boolean) => {
    if (!force && activeKey === key) {
      if (pending) return pending
      if (state.status === 'success' || state.status === 'empty') return Promise.resolve(state)
    }
    activeKey = key
    const requestGeneration = ++generation
    publish({ status: 'loading', data: state.data })
    const request = load().then(result => {
      if (disposed || requestGeneration !== generation || activeKey !== key) return state
      if (!result.ok) return publish({ status: 'error', data: state.data })
      return publish({ status: options.isEmpty(result.data) ? 'empty' : 'success', data: result.data })
    }).catch(() => {
      if (disposed || requestGeneration !== generation || activeKey !== key) return state
      return publish({ status: 'error', data: state.data })
    }).finally(() => {
      if (requestGeneration === generation) pending = null
    })
    pending = request
    return request
  }

  return {
    activate() { disposed = false },
    ensure: (key, load) => run(key, load, false),
    retry: (key, load) => run(key, load, true),
    invalidate() { activeKey = null; pending = null; generation += 1; publish({ status: 'idle', data: null }) },
    dispose() { disposed = true; generation += 1; pending = null },
    getState: () => state,
  }
}
