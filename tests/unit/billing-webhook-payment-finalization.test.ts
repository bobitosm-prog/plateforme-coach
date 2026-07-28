import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createWebhookBillingRepository } from '@/lib/billing/webhook'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const SESSION_ID = 'cs_platform'
const EVENT_ID = 'evt_checkout'
const PAID_AT = '2026-07-28T12:00:00.000Z'

type DbResult = {
  data: Record<string, unknown> | null
  error: { code?: string; message: string } | null
}

function scriptedSupabase(input: {
  updates: DbResult[]
  lookups?: DbResult[]
}) {
  const updatePayloads: Array<Record<string, unknown>> = []
  const updateFilters: Array<Array<[string, string, unknown]>> = []
  const lookupFilters: Array<Array<[string, string, unknown]>> = []

  const builder = (
    result: DbResult,
    filters: Array<[string, string, unknown]>,
  ) => {
    const query = {
      eq: vi.fn((column: string, value: unknown) => {
        filters.push(['eq', column, value])
        return query
      }),
      is: vi.fn((column: string, value: unknown) => {
        filters.push(['is', column, value])
        return query
      }),
      in: vi.fn((column: string, value: unknown) => {
        filters.push(['in', column, value])
        return query
      }),
      select: vi.fn(() => query),
      maybeSingle: vi.fn(async () => result),
    }
    return query
  }

  const from = vi.fn(() => ({
    update(payload: Record<string, unknown>) {
      updatePayloads.push(payload)
      const filters: Array<[string, string, unknown]> = []
      updateFilters.push(filters)
      const result = input.updates.shift()
      if (!result) throw new Error('Missing scripted update result')
      return builder(result, filters)
    },
    select() {
      const filters: Array<[string, string, unknown]> = []
      lookupFilters.push(filters)
      const result = input.lookups?.shift()
      if (!result) throw new Error('Missing scripted lookup result')
      return builder(result, filters)
    },
  }))

  return {
    client: { from } as unknown as SupabaseClient,
    updatePayloads,
    updateFilters,
    lookupFilters,
  }
}

const finalization = (eventId = EVENT_ID) => ({
  sessionId: SESSION_ID,
  clientId: CLIENT_ID,
  eventId,
  paidAt: PAID_AT,
})

describe('Platform checkout payment finalization', () => {
  it('atomically persists paid state, timestamp and event without rewriting the session', async () => {
    const db = scriptedSupabase({
      updates: [{ data: { id: 'pay_1' }, error: null }],
    })
    const repository = createWebhookBillingRepository(db.client)

    await expect(repository.finalizePlatformPayment(finalization()))
      .resolves.toBe('finalized')

    expect(db.updatePayloads).toEqual([{
      status: 'paid',
      paid_at: PAID_AT,
      stripe_event_id: EVENT_ID,
    }])
    expect(db.updatePayloads[0]).not.toHaveProperty('stripe_checkout_session_id')
    expect(db.updateFilters[0]).toEqual([
      ['eq', 'stripe_checkout_session_id', SESSION_ID],
      ['eq', 'client_id', CLIENT_ID],
      ['is', 'coach_id', null],
      ['is', 'stripe_event_id', null],
      ['in', 'status', ['pending', 'paid']],
    ])
  })

  it('accepts replay of the same finalized event without a second mutation', async () => {
    const db = scriptedSupabase({
      updates: [{ data: null, error: null }],
      lookups: [{
        data: {
          status: 'paid',
          paid_at: PAID_AT,
          stripe_event_id: EVENT_ID,
        },
        error: null,
      }],
    })
    const repository = createWebhookBillingRepository(db.client)

    await expect(repository.finalizePlatformPayment(finalization()))
      .resolves.toBe('already_finalized')
    expect(db.updatePayloads).toHaveLength(1)
  })

  it('allows only one concurrent event to bind a payment and rejects the other', async () => {
    const otherEventId = 'evt_competing'
    const db = scriptedSupabase({
      updates: [
        { data: { id: 'pay_1' }, error: null },
        { data: null, error: null },
      ],
      lookups: [{
        data: {
          status: 'paid',
          paid_at: PAID_AT,
          stripe_event_id: EVENT_ID,
        },
        error: null,
      }],
    })
    const repository = createWebhookBillingRepository(db.client)

    const [first, competing] = await Promise.allSettled([
      repository.finalizePlatformPayment(finalization()),
      repository.finalizePlatformPayment(finalization(otherEventId)),
    ])

    expect(first).toEqual({ status: 'fulfilled', value: 'finalized' })
    expect(competing).toEqual(expect.objectContaining({ status: 'rejected' }))
    expect(db.updateFilters[1]).toContainEqual(['is', 'stripe_event_id', null])
    expect(db.lookupFilters[0]).toEqual([
      ['eq', 'stripe_checkout_session_id', SESSION_ID],
      ['eq', 'client_id', CLIENT_ID],
      ['is', 'coach_id', null],
    ])
  })

  it('fails closed on a foreign event uniqueness conflict with no partial fallback write', async () => {
    const db = scriptedSupabase({
      updates: [{
        data: null,
        error: { code: '23505', message: 'unique constraint violation' },
      }],
    })
    const repository = createWebhookBillingRepository(db.client)

    await expect(repository.finalizePlatformPayment(finalization()))
      .rejects.toThrow('checkout payment finalization conflict')
    expect(db.updatePayloads).toHaveLength(1)
    expect(db.lookupFilters).toHaveLength(0)
  })
})
