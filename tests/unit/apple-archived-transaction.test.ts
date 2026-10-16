import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '@apple/app-store-server-library'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ verify: vi.fn(), binding: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/apple/transaction-verification', () => ({ verifyAppleTransactionEvidence: mocks.verify }))
vi.mock('@/lib/apple/purchase-ledger', () => ({ prepareAppleAccountBinding: mocks.binding }))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: mocks.from } }))
import { acknowledgeArchivedAppleTransaction } from '@/lib/apple/archived-transaction'

const evidence = {
  environment: 'Sandbox', transactionId: '99', originalTransactionId: '90',
  productId: 'ch.moovx.app.athena.monthly', appAccountToken: '00000000-0000-4000-8000-000000000002',
  purchaseDate: Date.now() - 3600000, expiresDate: Date.now() - 1800000,
}
const results: Record<string, unknown> = {
  apple_purchase_owners: { app_account_token: evidence.appAccountToken },
  apple_account_bindings: { user_id: null },
  apple_transaction_evidence: { transaction_id: evidence.transactionId },
  apple_purchase_state: { state: 'active', access_until_ms: evidence.expiresDate },
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.verify.mockResolvedValue({ ...evidence })
  mocks.binding.mockResolvedValue('00000000-0000-4000-8000-000000000001')
  mocks.from.mockImplementation((table: string) => {
    const query = { select: vi.fn(), eq: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn(async () => ({ data: results[table], error: null })) }
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.limit.mockReturnValue(query)
    return query
  })
})

describe('expired Sandbox transaction cleanup', () => {
  it('acknowledges only previously recorded evidence from a deleted MoovX account', async () => {
    expect(await acknowledgeArchivedAppleTransaction('current-user', 'signed', Environment.SANDBOX)).toEqual({ status: 'archived', transactionId: '99' })
    expect(mocks.from.mock.calls.map(([name]) => name)).toEqual([
      'apple_purchase_owners', 'apple_account_bindings', 'apple_transaction_evidence', 'apple_purchase_state',
    ])
  })
  it('cannot finish a purchase still bound to another account', async () => {
    const old = results.apple_account_bindings
    results.apple_account_bindings = { user_id: 'original-user' }
    try { expect(await acknowledgeArchivedAppleTransaction('current-user', 'signed', Environment.SANDBOX)).toBeNull() }
    finally { results.apple_account_bindings = old }
  })
  it('cannot finish active or production purchases', async () => {
    mocks.verify.mockResolvedValueOnce({ ...evidence, expiresDate: Date.now() + 86400000 })
    expect(await acknowledgeArchivedAppleTransaction('current-user', 'signed', Environment.SANDBOX)).toBeNull()
    expect(await acknowledgeArchivedAppleTransaction('current-user', 'signed', Environment.PRODUCTION)).toBeNull()
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
