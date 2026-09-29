import 'server-only'
import { Environment } from '@apple/app-store-server-library'
import { processOneAppleNotification } from './notification-worker'
import { reconcileApplePurchase, type AppleReconciliation } from './reconciliation'
import type { AppleEnvironment, VerifiedAppleTransaction } from './transaction-verification'
interface Job { userId: string; leaseToken: string; transaction: VerifiedAppleTransaction }
export interface SyncDependencies {
  notification: typeof processOneAppleNotification
  claim(environment: AppleEnvironment): Promise<Job | null>
  reconcile: typeof reconcileApplePurchase
  finish(job: Job, observation: AppleReconciliation | null): Promise<void>
}
const defaults: SyncDependencies = {
  notification: processOneAppleNotification,
  claim: async environment => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin')
    const { data, error } = await supabaseAdmin.rpc('claim_apple_reconciliation', { p_environment: environment })
    if (error) throw new Error('APPLE_QUEUE_UNAVAILABLE')
    if (!data) return null
    if (!data.userId || !data.leaseToken || data.transaction?.environment !== environment) throw new Error('APPLE_QUEUE_INVALID')
    return data as Job
  },
  reconcile: reconcileApplePurchase,
  finish: async (job, observation) => {
    const { supabaseAdmin } = await import('@/lib/supabase/admin')
    const { error } = await supabaseAdmin.rpc('finish_apple_reconciliation', {
      p_environment: job.transaction.environment, p_original: job.transaction.originalTransactionId,
      p_lease: job.leaseToken, p_observation: observation,
    })
    if (error) throw new Error('APPLE_QUEUE_UNAVAILABLE')
  },
}
/** Bounded work per invocation; leases permit safe concurrency and crash recovery. */
export async function runAppleSync(environment: AppleEnvironment, deps = defaults) {
  if (environment !== Environment.PRODUCTION && environment !== Environment.SANDBOX) throw new Error('APPLE_INVALID_ENVIRONMENT')
  const notification = await deps.notification(environment)
  const job = await deps.claim(environment)
  if (!job) return { notification, reconciliation: 'idle' }
  try {
    const observation = await deps.reconcile(job.transaction, { environment, expectedAccountToken: job.transaction.appAccountToken })
    await deps.finish(job, observation)
    return { notification, reconciliation: 'processed' }
  } catch {
    await deps.finish(job, null)
    return { notification, reconciliation: 'retry' }
  }
}
