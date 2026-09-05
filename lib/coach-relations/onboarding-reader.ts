import type { SupabaseClient } from '@supabase/supabase-js'
import {
  findActiveCoachForClient,
  resolveCoachRelationAuthority,
  type ActiveRelationLookupResult,
} from './repository'

type ActiveCoachFinder = (
  client: SupabaseClient,
  clientId: string,
) => Promise<ActiveRelationLookupResult>

export type OnboardingCoachLookup =
  | { kind: 'active'; coachId: string }
  | { kind: 'inactive' }
  | { kind: 'denied' }

export async function resolveActiveCoachForOnboarding(
  client: SupabaseClient,
  clientId: string,
  findActiveCoach: ActiveCoachFinder = findActiveCoachForClient,
): Promise<OnboardingCoachLookup> {
  try {
    const result = await findActiveCoach(client, clientId)
    const authority = resolveCoachRelationAuthority(result)
    if (authority.isAuthoritative && authority.relation) {
      return { kind: 'active', coachId: authority.relation.coach_id }
    }
    if (authority.physicalState === 'not_found' || authority.authorityState === 'non_authoritative') {
      return { kind: 'inactive' }
    }
    return { kind: 'denied' }
  } catch {
    return { kind: 'denied' }
  }
}
