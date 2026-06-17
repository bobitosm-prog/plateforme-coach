'use client'
import { useEffect, useState, useCallback } from 'react'
import { adminFetch } from '@/lib/admin/api-client'

export interface Campaign {
  id: string
  name: string
  free_days: number
  max_slots: number
  used_slots: number
  is_active: boolean
  created_at: string
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetch<{ campaigns: Campaign[] }>('/api/admin/campaigns')
      setCampaigns(data.campaigns)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const createCampaign = useCallback(async (body: { name: string; free_days: number; max_slots: number }) => {
    await adminFetch('/api/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    await fetchCampaigns()
  }, [fetchCampaigns])

  const updateCampaign = useCallback(async (id: string, patch: Partial<Pick<Campaign, 'name' | 'free_days' | 'max_slots' | 'is_active'>>) => {
    await adminFetch(`/api/admin/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    await fetchCampaigns()
  }, [fetchCampaigns])

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    await updateCampaign(id, { is_active: isActive })
  }, [updateCampaign])

  return {
    campaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    toggleActive,
    refresh: fetchCampaigns,
  }
}
