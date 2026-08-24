import type { SupabaseClient } from '@supabase/supabase-js'
import {
  findActiveCoachForClient,
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
    if (result.kind === 'active') {
      return { kind: 'active', coachId: result.relation.coach_id }
    }
    if (result.kind === 'not_found') return { kind: 'inactive' }
    return { kind: 'denied' }
  } catch {
    return { kind: 'denied' }
  }
}
