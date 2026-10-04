import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('server-only', () => ({}))
const m = vi.hoisted(() => ({ db: {} as any, context: vi.fn(), generate: vi.fn(), usage: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseRouteClient: async () => m.db }))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => m.db }))
vi.mock('@/lib/api-guard', () => ({ guardCoachManagedCapabilities: async () => null }))
vi.mock('@/lib/athena/generation-context', () => ({ loadAthenaGenerationContext: m.context }))
vi.mock('@/lib/training/load-exercise-catalog', () => ({ loadExerciseCatalog: async () => [] }))
vi.mock('@/lib/training/generate-program', () => ({ generateProgram: m.generate }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: () => ({ allowed: true }), checkAiRateLimit: async () => ({ allowed: true }),
  checkAiQuota: async () => ({ allowed: true }), logAiUsage: m.usage,
  aiQuotaResponse: vi.fn(), aiRateLimitResponse: vi.fn(),
}))
import { POST } from '@/app/api/generate-program/route'
import { AI_ACCOUNT_HEADER, AI_SUBJECT_HEADER, AI_CONSENT_VERSION } from '@/lib/ai/consent-policy'
const coach = '00000000-0000-4000-8000-000000000001'
const client = '00000000-0000-4000-8000-000000000002'
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('ANTHROPIC_API_KEY', 'synthetic-test-only')
  m.db = {
    auth: { getUser: async () => ({ data: { user: { id: coach } } }) },
    from: (table: string) => {
      const filters: Record<string,string> = {}
      const query = {
        select: () => query, eq: (key: string, value: string) => { filters[key]=value; return query },
        limit: async () => ({ data: [{ id: 'relation', coach_id: coach, client_id: client, status: 'active', source: 'invitation' }] }),
        maybeSingle: async () => ({ data: table === 'ai_consents' && filters.user_id === client
          ? { granted: true, version: AI_CONSENT_VERSION } : null }),
      }
      return query
    },
  }
  m.context.mockImplementation(async (_db, subject) => ({ ok: true, prompt: subject === client ? 'CLIENT PROFILE' : 'COACH PROFILE' }))
  m.generate.mockResolvedValue({ days: [] })
})
it('uses the real authorization wrapper and client context, while charging the coach quota', async () => {
  const response = await POST(new NextRequest('http://localhost/api/generate-program', {
    method: 'POST', headers: { 'Content-Type': 'application/json', [AI_ACCOUNT_HEADER]: coach, [AI_SUBJECT_HEADER]: client },
    body: JSON.stringify({ objective: 'Muscle', level: 'intermediaire', equipment: 'salle', trainingDays: 4 }),
  }))
  expect(response.status).toBe(200)
  expect(m.context).toHaveBeenCalledWith(m.db, client)
  expect(m.generate).toHaveBeenCalledWith(expect.objectContaining({ clientContext: 'CLIENT PROFILE' }), 'synthetic-test-only', [])
  expect(m.usage).toHaveBeenCalledWith(m.db, coach, 'generate-program')
  vi.unstubAllEnvs()
})
