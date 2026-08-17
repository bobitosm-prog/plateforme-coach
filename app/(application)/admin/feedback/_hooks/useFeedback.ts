'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { adminFetch } from '@/lib/admin/api-client'
import type { AdminBugReportRow } from '@/lib/admin/types'

export interface FeedbackStats {
  total: number
  unresolved: number
  by_type: Record<string, number>
}

export function useFeedback() {
  const [reports, setReports] = useState<AdminBugReportRow[]>([])
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('unresolved')
  const reqIdRef = useRef(0)

  const fetch_ = useCallback(async () => {
    const myId = ++reqIdRef.current
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', '300')
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())

      const data = await adminFetch<{
        reports: AdminBugReportRow[]
        count: number
        stats: FeedbackStats
      }>(`/api/admin/bug-reports?${params.toString()}`)

      if (myId !== reqIdRef.current) return
      setReports(data.reports)
      setStats(data.stats)
    } catch (e) {
      if (myId !== reqIdRef.current) return
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      if (myId === reqIdRef.current) setLoading(false)
    }
  }, [search, typeFilter, statusFilter])

  useEffect(() => {
    const t = setTimeout(() => { fetch_() }, 200)
    return () => clearTimeout(t)
  }, [fetch_])

  const updateReportLocally = useCallback((id: string, patch: Partial<AdminBugReportRow>) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }, [])

  return {
    reports, stats, loading, error,
    search, setSearch,
    typeFilter, setTypeFilter,
    statusFilter, setStatusFilter,
    refresh: fetch_,
    updateReportLocally,
  }
}
