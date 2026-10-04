import 'server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { findActiveBetween, resolveCoachRelationAuthority } from '@/lib/coach-relations/repository'
import { AI_SUBJECT_HEADER, AI_ACCOUNT_HEADER, AI_CONSENT_VERSION } from './consent-policy'

type Scope = { db: SupabaseClient; userId: string; actorId?: string }
const scopes = new AsyncLocalStorage<Scope>()

export class AiConsentError extends Error {
  constructor(public code: 'ai_consent_required' | 'ai_consent_unavailable' | 'ai_account_changed' | 'ai_subject_forbidden', public status = 403) {
    super(code)
  }
}

export async function readAiConsentState(db: SupabaseClient, userId: string) {
  const { data, error } = await db.from('ai_consents')
    .select('granted, version').eq('user_id', userId).maybeSingle()
  if (error) throw new AiConsentError('ai_consent_unavailable', 503)
  const decided = data?.version === AI_CONSENT_VERSION
  return { granted: decided && data?.granted === true, decided }
}

export async function readAiConsent(db: SupabaseClient, userId: string): Promise<boolean> {
  return (await readAiConsentState(db, userId)).granted
}

export async function assertAiConsent(db: SupabaseClient, userId: string) {
  if (!await readAiConsent(db, userId)) throw new AiConsentError('ai_consent_required')
}

export async function assertAiSubject(db: SupabaseClient, actorId: string, subjectId: string) {
  if (actorId === subjectId) return
  const relation = await findActiveBetween(db, actorId, subjectId)
  if (relation.kind === 'error') throw new AiConsentError('ai_consent_unavailable', 503)
  if (!resolveCoachRelationAuthority(relation).isAuthoritative) throw new AiConsentError('ai_subject_forbidden')
}

/** Business routes consume the verified scope, never an unchecked body/header ID. */
export function aiDataSubject(actorId: string): string {
  const scope = scopes.getStore()
  if (!scope || (scope.actorId ?? scope.userId) !== actorId) throw new AiConsentError('ai_account_changed', 409)
  return scope.userId
}

/** Cron callers must supply the actual data subject, never a coach/admin's consent. */
export function withAiUser<T>(db: SupabaseClient, userId: string, action: () => T): T {
  return scopes.run({ db, userId }, action)
}

/** All provider transports use this gate. Re-read before EVERY send/retry, without caching. */
export const consentedAnthropicFetch: typeof fetch = async (input, init) => {
  const scope = scopes.getStore()
  if (!scope) throw new AiConsentError('ai_consent_required')
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.origin !== 'https://api.anthropic.com') throw new Error('Unexpected AI provider')
  if (scope.actorId) await assertAiSubject(scope.db, scope.actorId, scope.userId)
  await assertAiConsent(scope.db, scope.userId)
  return fetch(input, { ...init, cache: 'no-store' })
}

/** Authenticate and check consent before business writes/quotas. Manual actions opt out explicitly. */
export function withAiConsent(
  handler: (req: NextRequest) => Promise<Response>,
  needsConsent: (req: NextRequest) => Promise<boolean> = async () => true,
  allowClientSubject = false,
) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      if (!await needsConsent(req)) return handler(req)
      const db = await createSupabaseRouteClient()
      const { data: { user }, error } = await db.auth.getUser()
      if (error || !user) return Response.json({ code: 'unauthorized' }, { status: 401 })
      if (!checkRateLimit(`ai-consent-gate:${user.id}`, 90, 60_000).allowed) {
        return Response.json({ code: 'rate_limited' }, { status: 429 })
      }
      if (req.headers.get(AI_ACCOUNT_HEADER) !== user.id) throw new AiConsentError('ai_account_changed', 409)
      const subjectId = req.headers.get(AI_SUBJECT_HEADER) ?? user.id
      if (subjectId !== user.id && (!allowClientSubject || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(subjectId))) {
        throw new AiConsentError('ai_subject_forbidden')
      }
      await assertAiSubject(db, user.id, subjectId)
      await assertAiConsent(db, subjectId)
      return await scopes.run({ db, userId: subjectId, actorId: user.id }, () => handler(req))
    } catch (error) {
      const known = error instanceof AiConsentError
      return Response.json({ code: known ? error.code : 'ai_consent_unavailable' }, {
        status: known ? error.status : 503, headers: { 'Cache-Control': 'no-store' },
      })
    }
  }
}
