import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  checkRateLimit: vi.fn(),
  checkAiRateLimit: vi.fn(),
  aiRateLimitResponse: vi.fn(),
  logAiUsage: vi.fn(),
  writeAssistant: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [] })),
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
  checkAiRateLimit: mocks.checkAiRateLimit,
  aiRateLimitResponse: mocks.aiRateLimitResponse,
  logAiUsage: mocks.logAiUsage,
}))
vi.mock('@/lib/coach-knowledge', () => ({
  COACH_SYSTEM_PROMPT: 'Athena system prompt',
}))
vi.mock('@/lib/supabase/trusted-ai-writer', () => ({
  writeTrustedAthenaAssistantMessage: mocks.writeAssistant,
}))

import { POST } from '@/app/api/chat-ai/route'

type Profile = { subscription_type: string }

function createSessionClient(
  profile: Profile = { subscription_type: 'solo' },
  userId: string | null = 'user-a',
) {
  const userInsert = vi.fn().mockResolvedValue({ error: null })
  const historyLimit = vi.fn().mockResolvedValue({ data: [] })
  const historyOrder = vi.fn().mockReturnValue({ limit: historyLimit })
  const historyEq = vi.fn().mockReturnValue({ order: historyOrder })
  const profileSingle = vi.fn().mockResolvedValue({ data: profile })
  const profileEq = vi.fn().mockReturnValue({ single: profileSingle })

  const from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return { select: vi.fn().mockReturnValue({ eq: profileEq }) }
    }

    if (table === 'chat_ai_messages') {
      return {
        select: vi.fn().mockReturnValue({ eq: historyEq }),
        insert: userInsert,
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: userId ? { id: userId } : null },
        }),
      },
      from,
    },
    from,
    userInsert,
    historyLimit,
  }
}

function request(body: unknown) {
  return new Request('http://localhost/api/chat-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Athena history role integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ANTHROPIC_API_KEY', 'anthropic-test-key')
    mocks.checkRateLimit.mockReturnValue({ allowed: true })
    mocks.checkAiRateLimit.mockResolvedValue({ allowed: true })
    mocks.logAiUsage.mockResolvedValue(undefined)
    mocks.writeAssistant.mockResolvedValue(undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      content: [{ text: 'Réponse Athena' }],
    }), { status: 200 })))
  })

  it('denies assistant and cross-user inserts through the authenticated RLS policy', () => {
    const migration = readFileSync(
      'supabase/migrations/20260821103000_harden_chat_ai_message_roles.sql',
      'utf8',
    )

    expect(migration).toContain('DROP POLICY IF EXISTS "users insert own chat ai messages"')
    expect(migration).toMatch(/user_id\s*=\s*auth\.uid\(\)/)
    expect(migration).toMatch(/role\s*=\s*'user'/)
    expect(migration).toMatch(/user_id\s*=\s*auth\.uid\(\)[\s\S]*AND\s*role\s*=\s*'user'/)
    expect(migration).not.toMatch(/FOR (SELECT|UPDATE|DELETE)/)
  })

  it('forces user and assistant roles on their respective trusted writers', async () => {
    const session = createSessionClient()
    mocks.createServerClient.mockReturnValue(session.client)

    const response = await POST(request({ message: '  bonjour  ' }) as never)

    expect(response.status).toBe(200)
    expect(session.userInsert).toHaveBeenCalledWith({
      user_id: 'user-a',
      role: 'user',
      content: 'bonjour',
    })
    expect(mocks.writeAssistant).toHaveBeenCalledWith({
      authenticatedUserId: 'user-a',
      content: 'Réponse Athena',
    })
    expect(session.historyLimit).toHaveBeenCalledWith(10)
  })

  it.each([
    { message: 123 },
    { message: 'test', role: 'assistant' },
  ])('rejects invalid or role-injected payloads: %j', async body => {
    const session = createSessionClient()
    mocks.createServerClient.mockReturnValue(session.client)

    const response = await POST(request(body) as never)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Requête invalide' })
    expect(session.from).not.toHaveBeenCalled()
    expect(mocks.writeAssistant).not.toHaveBeenCalled()
  })

  it('keeps invited clients blocked', async () => {
    const session = createSessionClient({ subscription_type: 'invited' })
    mocks.createServerClient.mockReturnValue(session.client)

    const response = await POST(request({ message: 'bonjour' }) as never)

    expect(response.status).toBe(403)
    expect(session.userInsert).not.toHaveBeenCalled()
    expect(mocks.writeAssistant).not.toHaveBeenCalled()
  })

  it('keeps unauthenticated users blocked', async () => {
    const session = createSessionClient({ subscription_type: 'solo' }, null)
    mocks.createServerClient.mockReturnValue(session.client)

    const response = await POST(request({ message: 'bonjour' }) as never)

    expect(response.status).toBe(401)
    expect(session.from).not.toHaveBeenCalled()
    expect(mocks.writeAssistant).not.toHaveBeenCalled()
  })

  it('keeps history loading and deletion contracts unchanged', () => {
    const hookSource = readFileSync('app/hooks/useChatAI.ts', 'utf8')

    expect(hookSource).toMatch(/\.order\('created_at', \{ ascending: true \}\)\s*\.limit\(100\)/)
    expect(hookSource).toMatch(/\.from\('chat_ai_messages'\)\s*\.delete\(\)\s*\.eq\('user_id', user\.id\)/)
  })
})
