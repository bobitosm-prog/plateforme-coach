import type { SupabaseClient } from '@supabase/supabase-js'

export const ACTIVE_COACH_RELATION_PROJECTION = 'id,coach_id,client_id,status' as const

export interface ActiveCoachRelation {
  id: string
  coach_id: string
  client_id: string
  status: 'active'
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
  coachId: string | null
  status: ActiveRelationLookupResult['kind']
}

export function toActiveCoachResolutionState(
  result: ActiveRelationLookupResult,
): ActiveCoachResolutionState {
  return result.kind === 'active'
    ? { coachId: result.relation.coach_id, status: 'active' }
    : { coachId: null, status: result.kind }
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
      || typeof Reflect.get(row, 'id') !== 'string'
      || typeof Reflect.get(row, 'coach_id') !== 'string'
      || typeof Reflect.get(row, 'client_id') !== 'string'
    ) {
      return null
    }
    relations.push(row as ActiveCoachRelation)
  }
  return relations
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
