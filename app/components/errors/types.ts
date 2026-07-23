export type CriticalErrorDomain = 'global' | 'coach' | 'client-detail'

export type AppRouterErrorProps = {
  readonly error: Error & { readonly digest?: string }
  readonly reset: () => void
}

export type DomainErrorCopy = {
  readonly title: string
  readonly description: string
  readonly retryLabel: string
  readonly navigationLabel: string
  readonly navigationTarget: string
}
