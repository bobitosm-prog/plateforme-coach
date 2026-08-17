'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { adminFetch } from '@/lib/admin/api-client'

export interface AdminPaymentRow {
  id: string
  amount: number
  currency: string
  status: string
  description: string | null
  stripe_checkout_session_id: string | null
  paid_at: string | null
  created_at: string
  client_id: string | null
  coach_id: string | null
  client: { id: string; email: string; full_name: string | null } | null
  coach: { id: string; email: string; full_name: string | null } | null
}

export function usePayments() {
  const [payments, setPayments] = useState<AdminPaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [periodDays, setPeriodDays] = useState<number>(90)
  const reqIdRef = useRef(0)

  const fetch_ = useCallback(async () => {
    const myId = ++reqIdRef.current
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', '200')
      if (statusFilter) params.set('status', statusFilter)
      if (periodDays > 0) {
        const since = new Date()
        since.setDate(since.getDate() - periodDays)
        params.set('since', since.toISOString())
      }
      const data = await adminFetch<{ payments: AdminPaymentRow[]; count: number }>(
        `/api/admin/stripe/payments?${params.toString()}`
      )
      if (myId !== reqIdRef.current) return
      setPayments(data.payments)
    } catch (e) {
      if (myId !== reqIdRef.current) return
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      if (myId === reqIdRef.current) setLoading(false)
    }
  }, [statusFilter, periodDays])

  useEffect(() => { fetch_() }, [fetch_])

  return { payments, loading, error, statusFilter, setStatusFilter, periodDays, setPeriodDays, refresh: fetch_ }
}
