'use client'
import { useState, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveUserCapabilities } from './entitlements/capabilities'
import {
  findActiveCoachForClient,
  toActiveCoachResolutionState,
  type ActiveRelationLookupResult,
} from './coach-relations/repository'

export interface ClientPermissions {
  canCreatePrograms: boolean
  canUseAI: boolean
  canModifyNutrition: boolean
  isCoachManaged: boolean
  coachId: string | null
  coachRelationStatus: ActiveRelationLookupResult['kind']
  loading: boolean
}

type LoadedClientPermissions = Omit<ClientPermissions, 'loading'>

export function deriveClientPermissions(
  subscriptionType: string | null | undefined,
  relation: ActiveRelationLookupResult,
): LoadedClientPermissions {
  const capabilities = resolveUserCapabilities({ subscriptionType })
  const coach = toActiveCoachResolutionState(relation)

  return {
    canCreatePrograms: capabilities.training,
    canUseAI: capabilities.ai,
    canModifyNutrition: capabilities.nutrition,
    isCoachManaged: capabilities.coachManaged,
    coachId: coach.coachId,
    coachRelationStatus: coach.status,
  }
}

export function useClientPermissions(userId: string | undefined, supabase: SupabaseClient): ClientPermissions {
  const [permissions, setPermissions] = useState<ClientPermissions>({
    canCreatePrograms: true,
    canUseAI: true,
    canModifyNutrition: true,
    isCoachManaged: false,
    coachId: null,
    coachRelationStatus: 'not_found',
    loading: true,
  })

  useEffect(() => {
    if (!userId) return
    let active = true

    // Product entitlement and coach relationship are independent sources.
    Promise.all([
      supabase.from('profiles').select('subscription_type').eq('id', userId).maybeSingle(),
      findActiveCoachForClient(supabase, userId),
    ]).then(([profileRes, relation]) => {
      if (!active) return
      setPermissions({
        ...deriveClientPermissions(profileRes.data?.subscription_type, relation),
        loading: false,
      })
    })

    return () => { active = false }
  }, [userId, supabase])

  return permissions
}
