'use client'

import { emptyStateStyle } from '../../../../lib/design-tokens'

interface CardEmptyStateProps {
  label: string
}

/**
 * Empty state partagé des cartes Home. Reçoit le label traduit en prop.
 * Style via emptyStateStyle (design-tokens).
 */
export default function CardEmptyState({ label }: CardEmptyStateProps) {
  return <span style={emptyStateStyle}>{label}</span>
}
