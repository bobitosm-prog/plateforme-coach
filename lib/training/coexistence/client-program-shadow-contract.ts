import type { AssignedProgramRow } from '@/lib/repositories/training/program'
import type { AdapterContext } from '@/lib/training/model'

export const CLIENT_PROGRAM_SHADOW_MAX_ROWS_PER_READ = 1 as const

export const CLIENT_PROGRAM_SHADOW_CRITICAL_PROPERTIES = [
  'client_owner',
  'coach_assigner',
  'day_order',
  'rest_days',
  'exercise_order',
  'exercise_references',
  'sets',
  'repetitions',
  'rest_seconds',
] as const

export const CLIENT_PROGRAM_SHADOW_WARNING_PROPERTIES = [
  'missing_source_program',
  'legacy_name_reference',
  'non_critical_unmapped_fields',
] as const

export const CLIENT_PROGRAM_SHADOW_EXCLUDED_PROPERTIES = [
  'assignment_status',
  'source_revision',
  'timezone',
] as const

export type ClientProgramShadowSelection =
  | { readonly consumer: 'dashboard-client' }
  | { readonly consumer: 'coach-client-detail'; readonly coachUserId: string }

export type ClientProgramAdaptationEnvelope =
  | {
      readonly status: 'ready'
      readonly input: {
        readonly program: AssignedProgramRow['program']
        readonly created_at?: string
      }
      readonly context: AdapterContext
    }
  | {
      readonly status: 'unsupported'
      readonly reason: 'MISSING_CLIENT_OWNER'
    }

/**
 * Mirrors the two existing consumer rules without inventing a global active
 * assignment. The repository already returns rows ordered by created_at DESC.
 */
export function selectClientProgramShadowCandidate(
  rows: readonly AssignedProgramRow[],
  selection: ClientProgramShadowSelection,
): AssignedProgramRow | null {
  if (selection.consumer === 'dashboard-client') return rows[0] ?? null
  return rows.find(row => row.coach_id === selection.coachUserId) ?? null
}

/**
 * Builds the narrow adapter boundary from an already selected legacy row.
 * Database ownership/source fields are carried by AdapterContext and cannot be
 * reported as unmapped payload fields by adaptClientAssignment.
 */
export function buildClientProgramAdaptationEnvelope(
  row: AssignedProgramRow,
  observedAt: string,
): ClientProgramAdaptationEnvelope {
  if (!row.client_id) return { status: 'unsupported', reason: 'MISSING_CLIENT_OWNER' }

  const input: { program: AssignedProgramRow['program']; created_at?: string } = {
    program: row.program,
  }
  if (row.created_at) input.created_at = row.created_at

  const context: AdapterContext = {
    id: row.id,
    now: observedAt,
    owner: { kind: 'client', clientId: row.client_id },
    clientId: row.client_id,
    sourceId: row.id,
    name: 'Programme assigné',
  }
  if (row.coach_id) context.coachId = row.coach_id
  if (row.training_program_id) context.sourceProgramId = row.training_program_id

  return { status: 'ready', input, context }
}
