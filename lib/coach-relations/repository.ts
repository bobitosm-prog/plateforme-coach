import type { SupabaseClient } from '@supabase/supabase-js'
import type { CoachRelationSource } from './types'

export const ACTIVE_COACH_RELATION_PROJECTION = 'id,coach_id,client_id,status,source,created_at,invited_by_coach' as const

export interface ActiveCoachRelation {
  id: string
  coach_id: string
  client_id: string
  status: 'active'
  source: CoachRelationSource
  created_at?: string
  invited_by_coach?: boolean | null
}

export type ActiveRelationLookupResult =
  | { kind: 'active'; relation: ActiveCoachRelation }
  | { kind: 'not_found' }
  | { kind: 'multiple_active' }
  | { kind: 'error'; code: string }

export type ActiveClientListResult =
  | { kind: 'success'; relations: ActiveCoachRelation[] }
  | { kind: 'multiple_active'; clientId: string }
  | { kind: 'error'; code: string }

export interface ActiveCoachResolutionState {
  /** Authoritative coach only. Null for default, legacy and uncertain states. */
  coachId: string | null
  physicalCoachId: string | null
  status: ActiveRelationLookupResult['kind']
  authorityState: CoachRelationAuthorityState
  source: CoachRelationSource | null
  isAuthoritative: boolean
  requiresReconciliation: boolean
}

export type CoachRelationAuthorityState =
  | 'authoritative'
  | 'non_authoritative'
  | 'not_found'
  | 'multiple_active'
  | 'error'

export interface CoachRelationAuthorityResolution {
  physicalState: ActiveRelationLookupResult['kind']
  authorityState: CoachRelationAuthorityState
  relation: ActiveCoachRelation | null
  source: CoachRelationSource | null
  isAuthoritative: boolean
  requiresReconciliation: boolean
  errorCode: string | null
}

export function resolveCoachRelationAuthority(
  result: ActiveRelationLookupResult,
): CoachRelationAuthorityResolution {
  if (result.kind === 'active') {
    const authoritative = result.relation.source === 'invitation'
      || result.relation.source === 'admin'

    return {
      physicalState: 'active',
      authorityState: authoritative ? 'authoritative' : 'non_authoritative',
      relation: result.relation,
      source: result.relation.source,
      isAuthoritative: authoritative,
      requiresReconciliation: result.relation.source === 'legacy',
      errorCode: null,
    }
  }

  return {
    physicalState: result.kind,
    authorityState: result.kind,
    relation: null,
    source: null,
    isAuthoritative: false,
    requiresReconciliation: false,
    errorCode: result.kind === 'error' ? result.code : null,
  }
}

export function toActiveCoachResolutionState(
  result: ActiveRelationLookupResult,
): ActiveCoachResolutionState {
  const authority = resolveCoachRelationAuthority(result)
  return {
    coachId: authority.isAuthoritative ? authority.relation?.coach_id ?? null : null,
    physicalCoachId: authority.relation?.coach_id ?? null,
    status: authority.physicalState,
    authorityState: authority.authorityState,
    source: authority.source,
    isAuthoritative: authority.isAuthoritative,
    requiresReconciliation: authority.requiresReconciliation,
  }
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = Reflect.get(error, 'code')
    if (typeof code === 'string' && code.length > 0) return code
  }
  return 'RELATION_LOOKUP_FAILED'
}

function parseActiveRelations(data: unknown): ActiveCoachRelation[] | null {
  if (!Array.isArray(data)) return data === null ? [] : null

  const relations: ActiveCoachRelation[] = []
  for (const row of data) {
    if (
      typeof row !== 'object'
      || row === null
      || Reflect.get(row, 'status') !== 'active'
      || !isCoachRelationSource(Reflect.get(row, 'source'))
      || typeof Reflect.get(row, 'id') !== 'string'
      || typeof Reflect.get(row, 'coach_id') !== 'string'
      || typeof Reflect.get(row, 'client_id') !== 'string'
      || ('created_at' in row && typeof Reflect.get(row, 'created_at') !== 'string')
      || ('invited_by_coach' in row
        && Reflect.get(row, 'invited_by_coach') !== null
        && typeof Reflect.get(row, 'invited_by_coach') !== 'boolean')
    ) {
      return null
    }
    relations.push(row as ActiveCoachRelation)
  }
  return relations
}

function isCoachRelationSource(value: unknown): value is CoachRelationSource {
  return value === 'default'
    || value === 'invitation'
    || value === 'admin'
    || value === 'legacy'
}

async function findActiveRelations(
  client: SupabaseClient,
  filters: ReadonlyArray<readonly [column: 'coach_id' | 'client_id', value: string]>,
): Promise<ActiveRelationLookupResult> {
  let query = client
    .from('coach_clients')
    .select(ACTIVE_COACH_RELATION_PROJECTION)

  for (const [column, value] of filters) query = query.eq(column, value)

  const { data, error } = await query.eq('status', 'active').limit(2)
  if (error) return { kind: 'error', code: errorCode(error) }

  const relations = parseActiveRelations(data)
  if (!relations) return { kind: 'error', code: 'INVALID_RELATION_DATA' }
  if (relations.length === 0) return { kind: 'not_found' }
  if (relations.length > 1) return { kind: 'multiple_active' }
  return { kind: 'active', relation: relations[0] }
}

export function findActiveBetween(
  client: SupabaseClient,
  coachId: string,
  clientId: string,
): Promise<ActiveRelationLookupResult> {
  return findActiveRelations(client, [
    ['coach_id', coachId],
    ['client_id', clientId],
  ])
}

export function findActiveCoachForClient(
  client: SupabaseClient,
  clientId: string,
): Promise<ActiveRelationLookupResult> {
  return findActiveRelations(client, [['client_id', clientId]])
}

export async function listActiveClientsForCoach(
  client: SupabaseClient,
  coachId: string,
): Promise<ActiveClientListResult> {
  const { data, error } = await client
    .from('coach_clients')
    .select(ACTIVE_COACH_RELATION_PROJECTION)
    .eq('coach_id', coachId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) return { kind: 'error', code: errorCode(error) }

  const relations = parseActiveRelations(data)
  if (!relations) return { kind: 'error', code: 'INVALID_RELATION_DATA' }

  const clientIds = new Set<string>()
  for (const relation of relations) {
    if (clientIds.has(relation.client_id)) {
      return { kind: 'multiple_active', clientId: relation.client_id }
    }
    clientIds.add(relation.client_id)
  }

  return { kind: 'success', relations }
}
