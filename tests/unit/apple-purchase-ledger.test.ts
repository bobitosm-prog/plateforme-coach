import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '@apple/app-store-server-library'
import { prepareAppleAccountBinding, recordAppleTransactionEvidence } from '@/lib/apple/purchase-ledger'
import type { VerifiedAppleTransaction } from '@/lib/apple/transaction-verification'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { rpc } }))
const user = '00000000-0000-4000-8000-000000000001'
const token = '00000000-0000-4000-8000-000000000099'
const evidence: VerifiedAppleTransaction = {
  environment: Environment.SANDBOX, appAccountToken: token,
  transactionId: '100', originalTransactionId: '100', productId: 'ch.moovx.app.athena.monthly',
  purchaseDate: 1000, signedDate: 2000, expiresDate: 3000, revocationDate: null, isUpgraded: false,
}
beforeEach(() => rpc.mockReset())
describe('Apple server-only ledger adapter', () => {
  it('obtains the server-owned binding for the authenticated user and environment', async () => {
    rpc.mockResolvedValue({ data: token, error: null })
    expect(await prepareAppleAccountBinding(user, Environment.SANDBOX)).toBe(token)
    expect(rpc).toHaveBeenCalledWith('prepare_apple_account_binding', { p_user_id: user, p_environment: 'Sandbox' })
  })
  it.each(['inserted', 'duplicate'] as const)('accepts atomic ledger result %s without creating entitlements', async result => {
    rpc.mockResolvedValue({ data: result, error: null })
    expect(await recordAppleTransactionEvidence(user, evidence)).toBe(result)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('record_apple_transaction_evidence', expect.objectContaining({
      p_user_id: user, p_app_account_token: token, p_signed_ms: 2000, p_environment: 'Sandbox', p_revoked_ms: null,
    }))
  })
  it('fails closed and redacts database details on ownership conflicts', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: `APPLE_OWNERSHIP_CONFLICT ${token}` } })
    await expect(recordAppleTransactionEvidence(user, evidence)).rejects.toThrow('APPLE_LEDGER_WRITE_FAILED')
  })
  it('rejects malformed RPC success responses', async () => {
    rpc.mockResolvedValue({ data: { active: true }, error: null })
    await expect(recordAppleTransactionEvidence(user, evidence)).rejects.toThrow('APPLE_LEDGER_WRITE_FAILED')
    await expect(prepareAppleAccountBinding(user, Environment.SANDBOX)).rejects.toThrow('APPLE_BINDING_UNAVAILABLE')
  })
  it('rejects invalid account identifiers before database access', async () => {
    await expect(recordAppleTransactionEvidence('bad', evidence)).rejects.toThrow('APPLE_INVALID_ACCOUNT')
    await expect(prepareAppleAccountBinding('bad', Environment.SANDBOX)).rejects.toThrow('APPLE_INVALID_ACCOUNT')
    expect(rpc).not.toHaveBeenCalled()
  })
})
