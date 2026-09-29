import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AppleEnvironment, VerifiedAppleTransaction } from './transaction-verification'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Call only after authenticating the user; environment comes from server config. */
export async function prepareAppleAccountBinding(userId: string, environment: AppleEnvironment): Promise<string> {
  if (!UUID.test(userId)) throw new Error('APPLE_INVALID_ACCOUNT')
  const { data, error } = await supabaseAdmin.rpc('prepare_apple_account_binding', {
    p_user_id: userId, p_environment: environment,
  })
  if (error || typeof data !== 'string' || !UUID.test(data)) throw new Error('APPLE_BINDING_UNAVAILABLE')
  return data
}

/** Persist only evidence from verifyAppleTransaction; this does NOT grant access. */
export async function recordAppleTransactionEvidence(
  userId: string, evidence: VerifiedAppleTransaction,
): Promise<'inserted' | 'duplicate'> {
  if (!UUID.test(userId)) throw new Error('APPLE_INVALID_ACCOUNT')
  const { data, error } = await supabaseAdmin.rpc('record_apple_transaction_evidence', {
    p_user_id: userId,
    p_environment: evidence.environment,
    p_app_account_token: evidence.appAccountToken,
    p_transaction_id: evidence.transactionId,
    p_original_transaction_id: evidence.originalTransactionId,
    p_product_id: evidence.productId,
    p_purchase_ms: evidence.purchaseDate,
    p_signed_ms: evidence.signedDate,
    p_expires_ms: evidence.expiresDate,
    p_revoked_ms: evidence.revocationDate,
    p_is_upgraded: evidence.isUpgraded,
  })
  // Do not expose Postgres messages/details: they may contain account identifiers.
  if (error || (data !== 'inserted' && data !== 'duplicate')) throw new Error('APPLE_LEDGER_WRITE_FAILED')
  return data
}
