import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseRouteClient: mocks.create }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => ({ allowed: true }) }))
import { AI_ACCOUNT_HEADER, AI_CONSENT_VERSION } from '@/lib/ai/consent-policy'
import { consentedAnthropicFetch, withAiConsent, withAiUser } from '@/lib/ai/consent-server'
import { GET, POST } from '@/app/api/ai-consent/route'

const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
let owner: string | null
let unavailable: boolean
let rows: Map<string, { version: string; granted: boolean }>
let outbound: ReturnType<typeof vi.fn>
let rpc: ReturnType<typeof vi.fn>
let db: any
function request(userId = A, body: unknown = {}) {
  return new NextRequest('https://moovx.ch/api/ai-consent', { method: 'POST', headers: {
    'Content-Type': 'application/json', [AI_ACCOUNT_HEADER]: userId, origin: 'https://moovx.ch',
  }, body: JSON.stringify(body) })
}
beforeEach(() => {
  owner = A; unavailable = false; rows = new Map()
  outbound = vi.fn(async () => Response.json({ ok: true })); vi.stubGlobal('fetch', outbound)
  rpc = vi.fn(async (_name, params) => {
    rows.set(params.p_expected_user_id, { version: params.p_version, granted: params.p_granted })
    return { error: null }
  })
  db = { auth: { getUser: async () => ({ data: { user: owner ? { id: owner } : null } }) }, rpc,
    from: () => ({ select: () => ({ eq: (_key: string, userId: string) => ({ maybeSingle: async () => ({
      data: rows.get(userId) ?? null, error: unavailable ? { message: 'offline' } : null,
    }) }) }) }),
  }
  mocks.create.mockResolvedValue(db)
})
const send = () => consentedAnthropicFetch('https://api.anthropic.com/v1/messages', { method: 'POST' })

describe('actual consent transport and public route runtime', () => {
  it('fails closed without a data subject, with no network traffic', async () => {
    await expect(send()).rejects.toMatchObject({ code: 'ai_consent_required' })
    expect(outbound).not.toHaveBeenCalled()
  })
  it.each([null, { granted: false, version: AI_CONSENT_VERSION }, { granted: true, version: 'obsolete' }])('blocks absent, refused and obsolete consent: %j', async row => {
    if (row) rows.set(A, row)
    await expect(withAiUser(db, A, send)).rejects.toMatchObject({ code: 'ai_consent_required' })
    expect(outbound).not.toHaveBeenCalled()
  })
  it('blocks before business writes or quota reservations', async () => {
    const business = vi.fn(async () => Response.json({ ok: true }))
    expect((await withAiConsent(business)(request())).status).toBe(403)
    expect(business).not.toHaveBeenCalled()
  })
  it('returns 503 and sends nothing when the consent store fails', async () => {
    unavailable = true
    expect((await withAiConsent(send)(request())).status).toBe(503)
    expect(outbound).not.toHaveBeenCalled()
  })
  it('requires authentication and binds the request to the account that accepted', async () => {
    owner = null
    expect((await withAiConsent(send)(request())).status).toBe(401)
    owner = B; rows.set(B, { granted: true, version: AI_CONSENT_VERSION })
    expect((await withAiConsent(send)(request(A))).status).toBe(409)
    expect(outbound).not.toHaveBeenCalled()
  })
  it('allows a consented request and retains its subject inside an SSE stream', async () => {
    rows.set(A, { granted: true, version: AI_CONSENT_VERSION })
    const handler = withAiConsent(async () => new Response(new ReadableStream({ async start(controller) {
      await Promise.resolve()
      const response = await send()
      controller.enqueue(new TextEncoder().encode(await response.text())); controller.close()
    } })))
    const response = await handler(request())
    expect(await response.json()).toEqual({ ok: true })
    expect(outbound).toHaveBeenCalledTimes(1)
  })
  it('rechecks every step/retry after withdrawal', async () => {
    rows.set(A, { granted: true, version: AI_CONSENT_VERSION })
    await withAiUser(db, A, async () => {
      await send()
      rows.set(A, { granted: false, version: AI_CONSENT_VERSION })
      await expect(send()).rejects.toMatchObject({ code: 'ai_consent_required' })
    })
    expect(outbound).toHaveBeenCalledTimes(1)
  })
  it('isolates two concurrent cron subjects', async () => {
    rows.set(A, { granted: true, version: AI_CONSENT_VERSION })
    const results = await Promise.allSettled([withAiUser(db, A, send), withAiUser(db, B, send)])
    expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected'])
    expect(outbound).toHaveBeenCalledTimes(1)
  })
  it('leaves explicitly manual actions available without permission', async () => {
    const manual = vi.fn(async () => Response.json({ saved: true }))
    expect((await withAiConsent(manual, async () => false)(request())).status).toBe(200)
    expect(manual).toHaveBeenCalledOnce(); expect(outbound).not.toHaveBeenCalled()
  })
  it('records only explicit decisions and reads the committed result', async () => {
    expect(await (await GET(new NextRequest('https://moovx.ch/api/ai-consent'))).json()).toMatchObject({ granted: false, userId: A })
    const allow = await POST(request(A, { userId: A, version: AI_CONSENT_VERSION, granted: true }))
    expect(await allow.json()).toMatchObject({ granted: true })
    const revoke = await POST(request(A, { userId: A, version: AI_CONSENT_VERSION, granted: false }))
    expect(await revoke.json()).toMatchObject({ granted: false })
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(revoke.headers.get('Cache-Control')).toBe('no-store')
  })
  it('rejects another account, stale versions and cross-origin mutations', async () => {
    expect((await POST(request(A, { userId: B, version: AI_CONSENT_VERSION, granted: true }))).status).toBe(409)
    expect((await POST(request(A, { userId: A, version: 'old', granted: true }))).status).toBe(400)
    const foreign = request(A, { userId: A, version: AI_CONSENT_VERSION, granted: true })
    foreign.headers.set('origin', 'https://untrusted.example')
    expect((await POST(foreign)).status).toBe(403)
    expect(rpc).not.toHaveBeenCalled()
  })
})
