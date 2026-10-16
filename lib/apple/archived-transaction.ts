import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { prepareAppleAccountBinding } from './purchase-ledger'
import { verifyAppleTransactionEvidence, type AppleEnvironment } from './transaction-verification'

/** Only acknowledges an already recorded, expired Sandbox purchase from a deleted account. */
export async function acknowledgeArchivedAppleTransaction(userId: string, signedTransaction: string, environment: AppleEnvironment) {
  if (environment !== 'Sandbox') return null
  const evidence = await verifyAppleTransactionEvidence(signedTransaction, environment)
  const currentToken = await prepareAppleAccountBinding(userId, environment)
  if (evidence.appAccountToken === currentToken.toLowerCase() ||
      !['ch.moovx.app.athena.monthly', 'ch.moovx.app.athena.yearly'].includes(evidence.productId) ||
      evidence.expiresDate === null || evidence.expiresDate > Date.now() - 300_000) return null

  const { data: owner, error: ownerError } = await supabaseAdmin.from('apple_purchase_owners')
    .select('app_account_token').eq('environment', environment)
    .eq('original_transaction_id', evidence.originalTransactionId).maybeSingle()
  if (ownerError || owner?.app_account_token?.toLowerCase() !== evidence.appAccountToken) return null

  const { data: binding, error: bindingError } = await supabaseAdmin.from('apple_account_bindings')
    .select('user_id').eq('environment', environment)
    .eq('app_account_token', evidence.appAccountToken).maybeSingle()
  if (bindingError || !binding || binding.user_id !== null) return null

  const { data: recorded, error: evidenceError } = await supabaseAdmin.from('apple_transaction_evidence')
    .select('transaction_id').eq('environment', environment)
    .eq('transaction_id', evidence.transactionId)
    .eq('original_transaction_id', evidence.originalTransactionId)
    .eq('product_id', evidence.productId)
    .eq('purchase_ms', evidence.purchaseDate).limit(1).maybeSingle()
  if (evidenceError || !recorded) return null

  const { data: state, error: stateError } = await supabaseAdmin.from('apple_purchase_state')
    .select('access_until_ms,state').eq('environment', environment)
    .eq('original_transaction_id', evidence.originalTransactionId).maybeSingle()
  if (stateError || !state || state.state === 'lifetime' ||
      (state.access_until_ms !== null && state.access_until_ms > Date.now() - 300_000)) return null

  return { status: 'archived', transactionId: evidence.transactionId } as const
}
