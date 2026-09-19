import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { readActivePersonalMealPlan } from './personal-plan-repository'

export type ActivationSnapshot = { profileUpdatedAt: string | null; activePlanId: string | null; operationId: string }
export const ACTIVATION_CONTEXT_KEY = '_activation_context'
export const activationSnapshotSchema = z.object({
  profileUpdatedAt: z.string().datetime({ offset: true }).nullable(),
  activePlanId: z.string().uuid().nullable(), operationId: z.string().uuid(),
})

/** Capture before the slow provider call; activation rechecks under a DB lock. */
export async function loadActivationSnapshot(supabase: SupabaseClient, userId: string): Promise<ActivationSnapshot | null> {
  const { data, error } = await supabase.from('profiles').select('updated_at').eq('id', userId).single()
  if (error || !data) return null
  const active = await readActivePersonalMealPlan(supabase, userId)
  if (active.error) return null
  return { profileUpdatedAt: data.updated_at, activePlanId: active.data?.id ?? null, operationId: crypto.randomUUID() }
}
