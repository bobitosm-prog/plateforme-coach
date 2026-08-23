import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/admin'

export type EndRelationReason = 'client_request' | 'coach_request'

export type EndRelationResult =
  | { kind: 'ended'; relationId: string }
  | { kind: 'no_active_relation'; code: string }
  | { kind: 'conflict'; code: string }
  | { kind: 'error'; code: string }

type EndRelationInput = {
  clientId: string
  coachId: string
  actorId: string
  reason: EndRelationReason
}

function stringField(value: unknown, field: string): string | null {
  if (typeof value !== 'object' || value === null) return null
  const fieldValue = Reflect.get(value, field)
  return typeof fieldValue === 'string' && fieldValue.length > 0 ? fieldValue : null
}

function booleanField(value: unknown, field: string): boolean | null {
  if (typeof value !== 'object' || value === null) return null
  const fieldValue = Reflect.get(value, field)
  return typeof fieldValue === 'boolean' ? fieldValue : null
}

export async function endCoachClientRelation({
  clientId,
  coachId,
  actorId,
  reason,
}: EndRelationInput): Promise<EndRelationResult> {
  const { data, error } = await supabaseAdmin.rpc('transition_coach_client_relation', {
    p_client_id: clientId,
    p_coach_id: coachId,
    p_operation: 'end',
    p_source: 'legacy',
    p_actor_id: actorId,
    p_end_reason: reason,
  })

  if (error) return { kind: 'error', code: 'RELATION_TRANSITION_FAILED' }

  const outcome = stringField(data, 'outcome')
  const code = stringField(data, 'code')
  if (outcome === 'ended') {
    if (booleanField(data, 'success') !== true) {
      return { kind: 'error', code: 'RELATION_TRANSITION_RESPONSE_INVALID' }
    }
    const relationId = stringField(data, 'relationId')
    return relationId
      ? { kind: 'ended', relationId }
      : { kind: 'error', code: 'RELATION_TRANSITION_RESPONSE_INVALID' }
  }
  if (outcome === 'no_active_relation') {
    return { kind: 'no_active_relation', code: code || 'RELATION_ACTIVE_NOT_FOUND' }
  }
  if (outcome === 'conflict') {
    return { kind: 'conflict', code: code || 'RELATION_ACTIVE_COACH_CONFLICT' }
  }
  return { kind: 'error', code: code || 'RELATION_TRANSITION_RESPONSE_INVALID' }
}
