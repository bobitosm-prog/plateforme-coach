'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface AiQuotaState {
  remaining: number
  limit: number
  days: number
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useAiQuota(): AiQuotaState {
  const [remaining, setRemaining] = useState(0)
  const [limit, setLimit] = useState(4)
  const [days, setDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqIdRef = useRef(0)

  const fetchQuota = useCallback(async () => {
    const myId = ++reqIdRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-quota')
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      if (myId !== reqIdRef.current) return
      setRemaining(data.remaining ?? 0)
      setLimit(data.limit ?? 4)
      setDays(data.days ?? 0)
    } catch (e) {
      if (myId !== reqIdRef.current) return
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      if (myId === reqIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQuota() }, [fetchQuota])

  return { remaining, limit, days, loading, error, refresh: fetchQuota }
}
