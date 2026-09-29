import 'server-only'
import { verifyAppleTransaction } from './transaction-verification'
import { reconcileApplePurchase } from './reconciliation'
import { prepareAppleAccountBinding } from './purchase-ledger'

import { purchaseEnvironment } from './environment'
export { purchaseEnvironment } from './environment'

export async function syncApplePurchase(userId: string, signedTransaction: string) {
  const environment = purchaseEnvironment(userId)
  const token = await prepareAppleAccountBinding(userId, environment)
  const context = { environment, expectedAccountToken: token }
  const seed = await verifyAppleTransaction(signedTransaction, context)
  const observation = await reconcileApplePurchase(seed, context)
  const { supabaseAdmin } = await import('@/lib/supabase/admin')
  const { data, error } = await supabaseAdmin.rpc('apply_apple_purchase_observation', {
    p_environment: environment, p_user_id: userId, p_observation: observation,
  })
  if (error || (data !== 'processed' && data !== 'stale')) throw new Error('APPLE_SYNC_UNAVAILABLE')
  return { status: 'recorded', environment, transactionId: seed.transactionId } as const
}
