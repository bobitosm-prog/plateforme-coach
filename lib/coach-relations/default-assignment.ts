import 'server-only'

import { createCoachClientRelation, type CreateRelationResult } from '@/lib/coach-relations/lifecycle-writer'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type DefaultCoachAssignmentResult = CreateRelationResult

export function resolveDefaultCoachEmail(
  serverEmail: string | undefined,
  compatibilityEmail: string | undefined,
): string | null {
  const configuredEmail = serverEmail?.trim() || compatibilityEmail?.trim()
  return configuredEmail ? configuredEmail.toLowerCase() : null
}

type AssignDefaultCoachInput = {
  clientId: string
  actorId: string
  configuredEmail: string | null
}

export async function assignConfiguredDefaultCoach({
  clientId,
  actorId,
  configuredEmail,
}: AssignDefaultCoachInput): Promise<DefaultCoachAssignmentResult> {
  if (!configuredEmail) return { kind: 'error', code: 'DEFAULT_COACH_NOT_CONFIGURED' }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id,role')
    .eq('email', configuredEmail)
    .limit(2)

  if (profileError) return { kind: 'error', code: 'DEFAULT_COACH_LOOKUP_FAILED' }
  if (profiles?.length !== 1 || profiles[0]?.role !== 'coach') {
    return { kind: 'error', code: 'DEFAULT_COACH_INVALID' }
  }

  const coachId = profiles[0].id
  const { data: coachUser, error: coachUserError } = await supabaseAdmin.auth.admin.getUserById(coachId)
  if (coachUserError || !coachUser.user) {
    return { kind: 'error', code: 'DEFAULT_COACH_INVALID' }
  }

  return createCoachClientRelation({
    clientId,
    coachId,
    actorId,
    source: 'default',
  })
}
