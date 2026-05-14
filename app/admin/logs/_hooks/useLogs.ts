'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { adminFetch } from '@/lib/admin/api-client'

export interface AdminLogRow {
  id: string
  level: string
  message: string
  details: Record<string, unknown> | null
  user_id: string | null
  user_email: string | null
  page_url: string | null
  created_at: string
}

export function useLogs() {
  const [logs, setLogs] = useState<AdminLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const reqIdRef = useRef(0)

  const fetch_ = useCallback(async () => {
    const myId = ++reqIdRef.current
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', '200')
      params.set('level', 'admin_action')
      if (actionFilter) params.set('action', actionFilter)
      if (search.trim()) params.set('search', search.trim())
      const data = await adminFetch<{ logs: AdminLogRow[]; count: number }>(
        `/api/admin/logs?${params.toString()}`
      )
      if (myId !== reqIdRef.current) return
      setLogs(data.logs)
    } catch (e) {
      if (myId !== reqIdRef.current) return
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      if (myId === reqIdRef.current) setLoading(false)
    }
  }, [actionFilter, search])

  useEffect(() => {
    const t = setTimeout(() => { fetch_() }, 200)
    return () => clearTimeout(t)
  }, [fetch_])

  return { logs, loading, error, actionFilter, setActionFilter, search, setSearch, refresh: fetch_ }
}
