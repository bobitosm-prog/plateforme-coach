'use client'

import DomainErrorBoundary from '@/app/components/errors/DomainErrorBoundary'
import type { AppRouterErrorProps } from '@/app/components/errors/types'

export default function ClientDetailError({ reset }: AppRouterErrorProps) {
  return <DomainErrorBoundary domain="client-detail" reset={reset} />
}
