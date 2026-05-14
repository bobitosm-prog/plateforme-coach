import { useEffect, useState, useCallback } from 'react'

export interface MyFeedbackReport {
  id: string
  type: 'bug' | 'amelioration' | 'autre'
  title: string
  description: string
  status: string | null
  priority: string | null
  admin_reply: string | null
  replied_at: string | null
  replied_by: string | null
  read_by_user: boolean | null
  screenshot_url: string | null
  page_url: string | null
  created_at: string
  updated_at: string
}

interface MyFeedbackState {
  reports: MyFeedbackReport[]
  unreadCount: number
  loading: boolean
  error: string | null
}

/**
 * Hook : recupere les rapports du user + auto-mark-read au mount.
 */
export function useMyFeedback(autoMarkRead = true) {
  const [state, setState] = useState<MyFeedbackState>({
    reports: [],
    unreadCount: 0,
    loading: true,
    error: null,
  })

  const fetchReports = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch('/api/feedback/mine', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setState({
        reports: data.reports || [],
        unreadCount: data.unreadCount || 0,
        loading: false,
        error: null,
      })

      if (autoMarkRead && (data.unreadCount || 0) > 0) {
        setTimeout(async () => {
          try {
            await fetch('/api/feedback/mark-all-read', { method: 'POST' })
            setState(s => ({ ...s, unreadCount: 0 }))
          } catch (err) {
            console.warn('[useMyFeedback] mark-read failed:', err)
          }
        }, 1500)
      }
    } catch (err) {
      setState({
        reports: [],
        unreadCount: 0,
        loading: false,
        error: err instanceof Error ? err.message : 'Erreur de chargement',
      })
    }
  }, [autoMarkRead])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  return {
    ...state,
    refetch: fetchReports,
  }
}
