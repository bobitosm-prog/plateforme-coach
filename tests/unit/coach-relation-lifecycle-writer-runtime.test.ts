import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { rpc: mocks.rpc } }))

import { endCoachClientRelation } from '@/lib/coach-relations/lifecycle-writer'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const COACH_ID = '33333333-3333-4333-8333-333333333333'

describe('canonical relation lifecycle writer runtime wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates a client end to the canonical RPC without direct table mutation', async () => {
    mocks.rpc.mockResolvedValue({
      data: { success: true, outcome: 'ended', relationId: 'relation-1' },
      error: null,
    })

    await expect(endCoachClientRelation({
      clientId: CLIENT_ID,
      coachId: COACH_ID,
      actorId: CLIENT_ID,
      reason: 'client_request',
    })).resolves.toEqual({ kind: 'ended', relationId: 'relation-1' })

    expect(mocks.rpc).toHaveBeenCalledWith('transition_coach_client_relation', {
      p_client_id: CLIENT_ID,
      p_coach_id: COACH_ID,
      p_operation: 'end',
      p_source: 'legacy',
      p_actor_id: CLIENT_ID,
      p_end_reason: 'client_request',
    })
  })

  it('preserves the canonical no-active outcome for repeat requests', async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        success: false,
        outcome: 'no_active_relation',
        code: 'RELATION_ACTIVE_NOT_FOUND',
      },
      error: null,
    })

    await expect(endCoachClientRelation({
      clientId: CLIENT_ID,
      coachId: COACH_ID,
      actorId: CLIENT_ID,
      reason: 'client_request',
    })).resolves.toEqual({
      kind: 'no_active_relation',
      code: 'RELATION_ACTIVE_NOT_FOUND',
    })
  })

  it('does not leak database errors', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'sensitive detail' } })

    await expect(endCoachClientRelation({
      clientId: CLIENT_ID,
      coachId: COACH_ID,
      actorId: COACH_ID,
      reason: 'coach_request',
    })).resolves.toEqual({ kind: 'error', code: 'RELATION_TRANSITION_FAILED' })
  })
})
