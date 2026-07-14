import type { SupabaseClient } from '@supabase/supabase-js'

type AssignmentResult = {
  success?: boolean
  code?: string
  coachId?: string
  assigned?: boolean
  isDefault?: boolean
}

export type DefaultCoachAssignment = {
  coachId: string
  assigned: boolean
  isDefault: boolean
}

export async function assignConfiguredDefaultCoach(
  admin: SupabaseClient,
  clientId: string,
  configuredEmail: string | undefined,
): Promise<DefaultCoachAssignment> {
  const email = configuredEmail?.trim().toLowerCase()
  if (!email) throw new Error('DEFAULT_COACH_NOT_CONFIGURED')

  const { data: coaches, error: lookupError } = await admin
    .from('profiles')
    .select('id,role')
    .eq('email', email)
    .limit(2)
  if (lookupError) throw new Error('DEFAULT_COACH_LOOKUP_FAILED')
  if (coaches?.length !== 1 || coaches[0]?.role !== 'coach') {
    throw new Error('DEFAULT_COACH_INVALID')
  }

  const { data, error } = await admin.rpc('assign_default_coach', {
    p_client_id: clientId,
    p_coach_id: coaches[0].id,
  })
  if (error) throw new Error('DEFAULT_COACH_ASSIGNMENT_FAILED')
  const result = (data ?? {}) as AssignmentResult
  if (!result.success || !result.coachId) throw new Error(result.code || 'DEFAULT_COACH_ASSIGNMENT_FAILED')
  return { coachId: result.coachId, assigned: result.assigned === true, isDefault: result.isDefault === true }
}
