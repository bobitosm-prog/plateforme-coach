import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

import {
  createPlatformCheckoutRepository,
  PLATFORM_CHECKOUT_PROFILE_PROJECTION,
} from '@/lib/billing/checkout/repository'

const PAYMENT = {
  coach_id: null,
  client_id: '00000000-0000-4000-8000-000000000001',
  stripe_checkout_session_id: null,
  amount: 10,
  currency: 'chf' as const,
  description: 'MoovX Athena — Mensuel',
  status: 'pending' as const,
}

describe('platform checkout repository', () => {
  beforeEach(() => {
    mocks.createClient.mockReset()
  })

  it('reads the complete Billing authority and fails closed on a profile error', async () => {
    const single = vi.fn()
      .mockResolvedValueOnce({
        data: {
          role: 'client',
          subscription_status: null,
          subscription_type: null,
          stripe_subscription_id: null,
          subscription_end_date: null,
          trial_ends_at: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'profile unavailable' },
      })
    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({ eq }))
    const auth = {
      from: vi.fn(() => ({ select })),
    } as unknown as SupabaseClient
    const repository = createPlatformCheckoutRepository({
      auth,
      supabaseUrl: 'https://staging.supabase.test',
      serviceRoleKey: 'test-service-role',
      ownerEmail: 'owner@example.test',
    })

    await expect(repository.findProfile(PAYMENT.client_id)).resolves.toMatchObject({
      role: 'client',
      subscription_status: null,
      stripe_subscription_id: null,
    })
    await expect(repository.findProfile(PAYMENT.client_id))
      .rejects.toThrow('checkout profile lookup: profile unavailable')

    expect(select).toHaveBeenCalledWith(PLATFORM_CHECKOUT_PROFILE_PROJECTION)
    expect(eq).toHaveBeenCalledWith('id', PAYMENT.client_id)
  })

  it('fails closed when the pending payment insert is rejected', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'payment schema mismatch' },
    })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    mocks.createClient.mockReturnValue({
      from: vi.fn(() => ({ insert })),
    })

    const repository = createPlatformCheckoutRepository({
      auth: {} as SupabaseClient,
      supabaseUrl: 'https://staging.supabase.test',
      serviceRoleKey: 'test-service-role',
      ownerEmail: 'owner@example.test',
    })

    await expect(repository.createPendingPayment(PAYMENT))
      .rejects.toThrow('pending payment insert: payment schema mismatch')
    expect(insert).toHaveBeenCalledOnce()
    expect(insert).toHaveBeenCalledWith(PAYMENT)
    expect(select).toHaveBeenCalledWith('id')
  })

  it('returns the authoritative pending payment id', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'payment-1' },
      error: null,
    })
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({ single })),
    }))
    mocks.createClient.mockReturnValue({
      from: vi.fn(() => ({ insert })),
    })

    const repository = createPlatformCheckoutRepository({
      auth: {} as SupabaseClient,
      supabaseUrl: 'https://staging.supabase.test',
      serviceRoleKey: 'test-service-role',
      ownerEmail: 'owner@example.test',
    })

    await expect(repository.createPendingPayment(PAYMENT))
      .resolves.toEqual({ id: 'payment-1' })
  })

  it('attaches a session only through the pending platform-payment authority', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'payment-1' },
      error: null,
    })
    const query = {
      eq: vi.fn(),
      is: vi.fn(),
      select: vi.fn(() => ({ single })),
    }
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)
    const update = vi.fn(() => query)
    mocks.createClient.mockReturnValue({
      from: vi.fn(() => ({ update })),
    })

    const repository = createPlatformCheckoutRepository({
      auth: {} as SupabaseClient,
      supabaseUrl: 'https://staging.supabase.test',
      serviceRoleKey: 'test-service-role',
      ownerEmail: 'owner@example.test',
    })

    await expect(repository.attachCheckoutSession({
      paymentId: 'payment-1',
      clientId: PAYMENT.client_id,
      sessionId: 'cs_test',
    })).resolves.toBeUndefined()

    expect(update).toHaveBeenCalledWith({ stripe_checkout_session_id: 'cs_test' })
    expect(query.eq).toHaveBeenNthCalledWith(1, 'id', 'payment-1')
    expect(query.eq).toHaveBeenNthCalledWith(2, 'client_id', PAYMENT.client_id)
    expect(query.is).toHaveBeenNthCalledWith(1, 'coach_id', null)
    expect(query.eq).toHaveBeenNthCalledWith(3, 'status', 'pending')
    expect(query.is).toHaveBeenNthCalledWith(2, 'stripe_checkout_session_id', null)
    expect(query.select).toHaveBeenCalledWith('id')
  })

  it('fails closed when the checkout session association is rejected', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'payment authority mismatch' },
    })
    const query = {
      eq: vi.fn(),
      is: vi.fn(),
      select: vi.fn(() => ({ single })),
    }
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)
    const update = vi.fn(() => query)
    mocks.createClient.mockReturnValue({
      from: vi.fn(() => ({ update })),
    })

    const repository = createPlatformCheckoutRepository({
      auth: {} as SupabaseClient,
      supabaseUrl: 'https://staging.supabase.test',
      serviceRoleKey: 'test-service-role',
      ownerEmail: 'owner@example.test',
    })

    await expect(repository.attachCheckoutSession({
      paymentId: 'payment-1',
      clientId: PAYMENT.client_id,
      sessionId: 'cs_test',
    })).rejects.toThrow('checkout session attach: payment authority mismatch')

    expect(update).toHaveBeenCalledOnce()
  })
})
