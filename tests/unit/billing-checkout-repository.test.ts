import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

import { createPlatformCheckoutRepository } from '@/lib/billing/checkout/repository'

const PAYMENT = {
  coach_id: null,
  client_id: '00000000-0000-4000-8000-000000000001',
  stripe_checkout_session_id: 'cs_test',
  amount: 10,
  currency: 'chf' as const,
  description: 'MoovX Athena — Mensuel',
  status: 'pending' as const,
}

describe('platform checkout repository', () => {
  beforeEach(() => {
    mocks.createClient.mockReset()
  })

  it('fails closed when the pending payment insert is rejected', async () => {
    const insert = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'payment schema mismatch' },
    })
    mocks.createClient.mockReturnValue({
      from: vi.fn(() => ({ insert })),
    })

    const repository = createPlatformCheckoutRepository({
      auth: {} as SupabaseClient,
      supabaseUrl: 'https://staging.supabase.test',
      serviceRoleKey: 'test-service-role',
      ownerEmail: 'owner@example.test',
    })

    await expect(repository.insertPendingPayment(PAYMENT))
      .rejects.toThrow('pending payment insert: payment schema mismatch')
    expect(insert).toHaveBeenCalledOnce()
    expect(insert).toHaveBeenCalledWith(PAYMENT)
  })
})
