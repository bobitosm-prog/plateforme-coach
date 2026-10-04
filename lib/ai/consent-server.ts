import 'server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { AI_ACCOUNT_HEADER, AI_CONSENT_VERSION } from './consent-policy'

type Scope = { db: SupabaseClient; userId: string }
const scopes = new AsyncLocalStorage<Scope>()

export class AiConsentError extends Error {
  constructor(public code: 'ai_consent_required' | 'ai_consent_unavailable' | 'ai_account_changed', public status = 403) {
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
  await assertAiConsent(scope.db, scope.userId)
  return fetch(input, { ...init, cache: 'no-store' })
}

/** Authenticate and check consent before business writes/quotas. Manual actions opt out explicitly. */
export function withAiConsent(
  handler: (req: NextRequest) => Promise<Response>,
  needsConsent: (req: NextRequest) => Promise<boolean> = async () => true,
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
      await assertAiConsent(db, user.id)
      return await withAiUser(db, user.id, () => handler(req))
    } catch (error) {
      const known = error instanceof AiConsentError
      return Response.json({ code: known ? error.code : 'ai_consent_unavailable' }, {
        status: known ? error.status : 503, headers: { 'Cache-Control': 'no-store' },
      })
    }
  }
}
