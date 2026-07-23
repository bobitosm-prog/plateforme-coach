'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DomainErrorView from './DomainErrorView'
import { createErrorResetGate } from './error-reset-gate'
import type { CriticalErrorDomain, DomainErrorCopy } from './types'

const COPY: Record<CriticalErrorDomain, DomainErrorCopy> = {
  global: {
    title: 'UNE ERREUR EST SURVENUE',
    description: 'Cette page n’a pas pu être affichée. Réessaie ou retourne à l’accueil.',
    retryLabel: 'RÉESSAYER',
    navigationLabel: 'RETOUR À L’ACCUEIL',
    navigationTarget: '/',
  },
  coach: {
    title: 'ESPACE COACH INDISPONIBLE',
    description: 'Cet espace n’a pas pu être affiché. Réessaie ou retourne au tableau de bord.',
    retryLabel: 'RÉESSAYER',
    navigationLabel: 'RETOUR AU TABLEAU DE BORD',
    navigationTarget: '/',
  },
  'client-detail': {
    title: 'PAGE INDISPONIBLE',
    description: 'Cette page n’a pas pu être affichée. Réessaie ou retourne à l’espace coach.',
    retryLabel: 'RÉESSAYER',
    navigationLabel: 'RETOUR À L’ESPACE COACH',
    navigationTarget: '/coach',
  },
}

type DomainErrorBoundaryProps = {
  readonly domain: CriticalErrorDomain
  readonly reset: () => void
}

export default function DomainErrorBoundary({
  domain,
  reset,
}: DomainErrorBoundaryProps) {
  const router = useRouter()
  const [gate] = useState(createErrorResetGate)
  const [resetFailed, setResetFailed] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const copy = COPY[domain]

  const handleReset = () => {
    setResetFailed(false)
    const result = gate.run(reset)
    if (result === 'started') setRetrying(true)
    if (result === 'failed') {
      setRetrying(false)
      setResetFailed(true)
    }
  }

  return (
    <DomainErrorView
      {...copy}
      onNavigate={() => router.replace(copy.navigationTarget)}
      onRetry={handleReset}
      resetFailed={resetFailed}
      retrying={retrying}
    />
  )
}
