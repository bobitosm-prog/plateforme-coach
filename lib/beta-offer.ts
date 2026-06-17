import 'server-only'
import { createSupabaseRouteClient } from '@/lib/supabase/server'

export type BetaOffer = { freeDays: number; slotsLeft: number; maxSlots: number }

/**
 * Retourne l'offre beta active, ou null si aucune campagne active / plus de place /
 * erreur DB. Best-effort : ne throw jamais.
 */
export async function getActiveBetaOffer(): Promise<BetaOffer | null> {
  try {
    const supabase = await createSupabaseRouteClient()
    const { data } = await supabase
      .from('beta_campaigns')
      .select('free_days, max_slots, used_slots, is_active')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (!data || !data.is_active) return null
    const slotsLeft = data.max_slots - data.used_slots
    if (slotsLeft <= 0) return null
    return { freeDays: data.free_days, slotsLeft, maxSlots: data.max_slots }
  } catch {
    return null
  }
}

export const STANDARD_TRIAL_DAYS = 14

/** Durée d'essai à afficher : la campagne beta si active, sinon le standard 14j. */
export function trialDaysFor(offer: BetaOffer | null): number {
  return offer?.freeDays ?? STANDARD_TRIAL_DAYS
}
