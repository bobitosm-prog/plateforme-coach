import type { CoachClientRow } from './types'

type Relation = { id: string; client_id: string; created_at: string | null; invited_by_coach: boolean | null }
type Profile = Omit<NonNullable<CoachClientRow['profiles']>, 'id'> & { id: string | null }
export type CoachClientSource = {
  listActiveClientsForCoach(coachId: string, options: { limit: number }): Promise<{ ok: true; data: Relation[] } | { ok: false }>
  listActiveRelatedProfiles(ids: string[], options: { limit: number }): Promise<{ ok: true; data: Profile[] } | { ok: false }>
}
export type CoachClientsResult = { ok: true; data: CoachClientRow[] } | { ok: false; error: { kind: 'unavailable'; contextCode: 'COACH_CLIENTS_UNAVAILABLE' } }

export async function loadCoachClients(source: CoachClientSource, coachId: string): Promise<CoachClientsResult> {
  const links = await source.listActiveClientsForCoach(coachId, { limit: 100 })
  if (!links.ok) return { ok: false, error: { kind: 'unavailable', contextCode: 'COACH_CLIENTS_UNAVAILABLE' } }
  if (!links.data.length) return { ok: true, data: [] }
  const profiles = await source.listActiveRelatedProfiles(links.data.map(link => link.client_id), { limit: 100 })
  if (!profiles.ok) return { ok: false, error: { kind: 'unavailable', contextCode: 'COACH_CLIENTS_UNAVAILABLE' } }
  const byId = new Map(profiles.data.filter((profile): profile is Profile & { id: string } => profile.id !== null).map(profile => [profile.id, profile]))
  return { ok: true, data: links.data.map(link => ({ id: link.id, client_id: link.client_id, created_at: link.created_at ?? '', invited_by_coach: link.invited_by_coach ?? false, profiles: byId.get(link.client_id) ?? null })) }
}
