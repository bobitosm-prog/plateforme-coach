'use client'
import { useState, useEffect } from 'react'

export interface ClientPermissions {
  canCreatePrograms: boolean
  canUseAI: boolean
  canModifyNutrition: boolean
  isInvited: boolean
  coachId: string | null
  loading: boolean
}

export function useClientPermissions(userId: string | undefined, supabase: any): ClientPermissions {
  const [permissions, setPermissions] = useState<ClientPermissions>({
    canCreatePrograms: true,
    canUseAI: true,
    canModifyNutrition: true,
    isInvited: false,
    coachId: null,
    loading: true,
  })

  useEffect(() => {
    if (!userId) return
    // Source de vérité : profiles.subscription_type (pas coach_clients.invited_by_coach)
    Promise.all([
      supabase.from('profiles').select('subscription_type').eq('id', userId).maybeSingle(),
      supabase.from('coach_clients').select('coach_id').eq('client_id', userId).maybeSingle(),
    ]).then(([profileRes, coachRes]: any[]) => {
      const isInvited = profileRes.data?.subscription_type === 'invited'
      setPermissions({
        canCreatePrograms: !isInvited,
        canUseAI: !isInvited,
        canModifyNutrition: !isInvited,
        isInvited,
        coachId: coachRes.data?.coach_id || null,
        loading: false,
      })
    })
  }, [userId])

  return permissions
}
