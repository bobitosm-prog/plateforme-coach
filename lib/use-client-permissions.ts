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
    supabase
      .from('coach_clients')
      .select('invited_by_coach, coach_id')
      .eq('client_id', userId)
      .maybeSingle()
      .then(({ data }: any) => {
        const isInvited = data?.invited_by_coach === true
        setPermissions({
          canCreatePrograms: !isInvited,
          canUseAI: !isInvited,
          canModifyNutrition: !isInvited,
          isInvited,
          coachId: data?.coach_id || null,
          loading: false,
        })
      })
  }, [userId])

  return permissions
}
