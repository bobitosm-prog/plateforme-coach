'use client'

import {
  buildProgressionViewModel,
  type ProgressionViewModel,
  type ProgressionViewModelInput,
} from '../../lib/progression/progression-dashboard-model'

export interface UseProgressionViewModelInput extends ProgressionViewModelInput {
  enabled?: boolean
}

/**
 * Pure client adapter for Progression V2. All remote reads remain in the
 * existing dashboard/analytics hooks; future visual components consume only
 * this normalized model.
 */
export default function useProgressionViewModel({
  enabled = true,
  ...input
}: UseProgressionViewModelInput): ProgressionViewModel {
  return buildProgressionViewModel({
    ...input,
    records: enabled ? input.records : { rows: [], state: 'loading' },
    wellbeing: enabled ? input.wellbeing : { rows: [], state: 'loading' },
  })
}
