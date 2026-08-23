import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/admin'

export type EndRelationReason = 'client_request' | 'coach_request'

export type EndRelationResult =
  | { kind: 'ended'; relationId: string }
  | { kind: 'no_active_relation'; code: string }
  | { kind: 'conflict'; code: string }
  | { kind: 'error'; code: string }

export type CreateRelationResult =
  | { kind: 'created'; relationId: string; coachId: string }
  | { kind: 'already_active_same_coach'; relationId: string; coachId: string }
  | { kind: 'conflict'; code: string; coachId: string | null }
  | { kind: 'error'; code: string }

type EndRelationInput = {
  clientId: string
  coachId: string
  actorId: string
  reason: EndRelationReason
}

type CreateRelationInput = {
  clientId: string
  coachId: string
  actorId: string
  source: 'default' | 'invitation' | 'admin' | 'legacy'
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

export async function createCoachClientRelation({
  clientId,
  coachId,
  actorId,
  source,
}: CreateRelationInput): Promise<CreateRelationResult> {
  const { data, error } = await supabaseAdmin.rpc('transition_coach_client_relation', {
    p_client_id: clientId,
    p_coach_id: coachId,
    p_operation: 'create',
    p_source: source,
    p_actor_id: actorId,
    p_end_reason: null,
  })

  if (error) return { kind: 'error', code: 'RELATION_TRANSITION_FAILED' }

  const outcome = stringField(data, 'outcome')
  const code = stringField(data, 'code')
  const resultCoachId = stringField(data, 'coachId')
  if (outcome === 'created' || outcome === 'already_active_same_coach') {
    const relationId = stringField(data, 'relationId')
    if (booleanField(data, 'success') !== true || !relationId || !resultCoachId) {
      return { kind: 'error', code: 'RELATION_TRANSITION_RESPONSE_INVALID' }
    }
    return { kind: outcome, relationId, coachId: resultCoachId }
  }
  if (outcome === 'conflict') {
    return {
      kind: 'conflict',
      code: code || 'RELATION_ACTIVE_COACH_CONFLICT',
      coachId: resultCoachId,
    }
  }
  return { kind: 'error', code: code || 'RELATION_TRANSITION_RESPONSE_INVALID' }
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
