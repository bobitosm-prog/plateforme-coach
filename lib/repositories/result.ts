export type RepositoryErrorKind = 'auth' | 'forbidden' | 'conflict' | 'unavailable' | 'unexpected'

export interface RepositoryError {
  kind: RepositoryErrorKind
  contextCode?: string
}

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'not_found' }
  | { ok: false; kind: 'failure'; error: RepositoryError }

interface DataErrorLike { code?: string | null }

export function repositoryFailure(error: DataErrorLike | null | undefined): RepositoryResult<never> {
  const rawCode = error?.code ?? ''
  const contextCode = /^[A-Za-z0-9_-]{1,32}$/.test(rawCode) ? rawCode : undefined
  const kind: RepositoryErrorKind = rawCode === '42501' || rawCode === 'PGRST301'
    ? 'forbidden'
    : rawCode === '23505' || rawCode === '409'
      ? 'conflict'
      : rawCode.startsWith('08') || rawCode === 'PGRST000'
        ? 'unavailable'
        : 'unexpected'
  return { ok: false, kind: 'failure', error: { kind, ...(contextCode ? { contextCode } : {}) } }
}
