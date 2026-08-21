import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

import { writeTrustedAthenaAssistantMessage } from '@/lib/supabase/trusted-ai-writer'

describe('trusted Athena assistant writer', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-only-test-key')
    mocks.insert.mockReset().mockResolvedValue({ error: null })
    mocks.from.mockReset().mockReturnValue({ insert: mocks.insert })
    mocks.createClient.mockReturnValue({ from: mocks.from })
  })

  it('forces the assistant role and uses the authenticated session user id', async () => {
    await writeTrustedAthenaAssistantMessage({
      authenticatedUserId: 'user-a',
      content: 'Réponse Athena',
    })

    expect(mocks.from).toHaveBeenCalledWith('chat_ai_messages')
    expect(mocks.createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'server-only-test-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )
    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: 'user-a',
      role: 'assistant',
      content: 'Réponse Athena',
    })
  })

  it('rejects invalid trusted messages before writing', async () => {
    await expect(writeTrustedAthenaAssistantMessage({
      authenticatedUserId: 'user-a',
      content: '   ',
    })).rejects.toThrow('Invalid trusted Athena assistant message')

    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('fails without leaking the database error', async () => {
    mocks.insert.mockResolvedValueOnce({ error: { message: 'sensitive database detail' } })

    await expect(writeTrustedAthenaAssistantMessage({
      authenticatedUserId: 'user-a',
      content: 'Réponse Athena',
    })).rejects.toThrow('Unable to persist trusted Athena assistant message')
  })
})
