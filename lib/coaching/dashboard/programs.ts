import type { CoachClientRow } from './types'
export function programEligibleClients(activeClients: readonly CoachClientRow[]): CoachClientRow[] { return [...activeClients] }
