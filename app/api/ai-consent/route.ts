import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseRouteClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { AI_CONSENT_VERSION } from '@/lib/ai/consent-policy'
import { readAiConsentState } from '@/lib/ai/consent-server'

const schema = z.object({
  userId: z.string().uuid(), version: z.literal(AI_CONSENT_VERSION), granted: z.boolean(),
}).strict()
const headers = { 'Cache-Control': 'no-store' }

async function handle(req: NextRequest) {
  try {
    const db = await createSupabaseRouteClient()
    const { data: { user }, error } = await db.auth.getUser()
    if (error || !user) return Response.json({ code: 'unauthorized' }, { status: 401, headers })
    if (!checkRateLimit(`ai-consent:${req.method}:${user.id}`, req.method === 'GET' ? 90 : 15).allowed) {
      return Response.json({ code: 'rate_limited' }, { status: 429, headers })
    }
    if (req.method === 'POST') {
      // Same-origin JSON mutations only; a stale dialog cannot grant for another account.
      if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) {
        return Response.json({ code: 'invalid_origin' }, { status: 403, headers })
      }
      const parsed = schema.safeParse(await req.json().catch(() => null))
      if (!parsed.success) return Response.json({ code: 'invalid_input' }, { status: 400, headers })
      if (parsed.data.userId !== user.id) return Response.json({ code: 'ai_account_changed' }, { status: 409, headers })
      const saved = await db.rpc('set_ai_consent', {
        p_granted: parsed.data.granted, p_version: parsed.data.version, p_expected_user_id: user.id,
      })
      if (saved.error) throw new Error('Consent persistence unavailable')
    }
    return Response.json({ userId: user.id, version: AI_CONSENT_VERSION, ...await readAiConsentState(db, user.id) }, { headers })
  } catch {
    return Response.json({ code: 'ai_consent_unavailable' }, { status: 503, headers })
  }
}
export const GET = handle
export const POST = handle
