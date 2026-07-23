'use client'

import DomainErrorBoundary from '@/app/components/errors/DomainErrorBoundary'
import type { AppRouterErrorProps } from '@/app/components/errors/types'

export default function CoachError({ reset }: AppRouterErrorProps) {
  return <DomainErrorBoundary domain="coach" reset={reset} />
}
