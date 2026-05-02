'use client'

import { useState, useEffect, useCallback } from 'react'

export interface OverloadSuggestion {
  id: string
  exercise_name: string
  current_weight: number
  current_reps: number
  suggested_weight: number
  suggested_reps: number
  reasoning: string | null
  status: 'pending' | 'accepted' | 'declined' | 'applied'
  triggered_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useOverloadSuggestion(userId: string | undefined, supabase: any) {
  const [suggestions, setSuggestions] = useState<OverloadSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('progressive_overload_suggestions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('triggered_at', { ascending: false })
    if (error) {
      console.error('[useOverloadSuggestion] fetch error:', error)
    }
    setSuggestions(data || [])
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    supabase
      .from('progressive_overload_suggestions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('triggered_at', { ascending: false })
      .then(({ data, error }: { data: OverloadSuggestion[] | null; error: unknown }) => {
        if (cancelled) return
        if (error) console.error('[useOverloadSuggestion] fetch error:', error)
        setSuggestions(data || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, supabase])

  async function accept(id: string) {
    const prev = suggestions
    setSuggestions(s => s.filter(x => x.id !== id))
    const { error } = await supabase
      .from('progressive_overload_suggestions')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      console.error('[useOverloadSuggestion] accept error:', error)
      setSuggestions(prev)
    }
  }

  async function decline(id: string) {
    const prev = suggestions
    setSuggestions(s => s.filter(x => x.id !== id))
    const { error } = await supabase
      .from('progressive_overload_suggestions')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      console.error('[useOverloadSuggestion] decline error:', error)
      setSuggestions(prev)
    }
  }

  // Dériver les valeurs exposées : si pas de userId, array vide + pas de loading
  const exposedSuggestions = userId ? suggestions : []
  const exposedLoading = userId ? loading : false

  return { suggestions: exposedSuggestions, loading: exposedLoading, refresh, accept, decline }
}
