'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

/* ── Types ── */
export type ClientStatus = 'active' | 'declining' | 'inactive' | 'new'
export type SortBy = 'status' | 'name' | 'lastActivity'
export type FilterBy = 'all' | 'active' | 'declining' | 'inactive'

export type ClientAnalytics = {
  client_id: string
  full_name: string
  email: string
  avatar_url: string | null
  subscription_type: string | null
  sessionsLast7d: number
  weightDelta7d: number | null
  mealAdherence7d: number
  streak: number
  lastActivity: Date | null
  status: ClientStatus
}

export type CoachAnalyticsKPI = {
  totalClients: number
  totalActive: number
  totalDeclining: number
  totalInactive: number
  sessionsThisWeekTotal: number
}

/* ── Helpers ── */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function computeStreak(sessionDates: string[]): number {
  if (sessionDates.length === 0) return 0
  const uniqueDays = [...new Set(sessionDates.map(d => d.split('T')[0]))].sort((a, b) => b.localeCompare(a))
  const today = new Date().toISOString().split('T')[0]
  const yesterday = daysAgo(1)

  // Le streak commence aujourd'hui ou hier
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1])
    const curr = new Date(uniqueDays[i])
    const diffMs = prev.getTime() - curr.getTime()
    const diffDays = Math.round(diffMs / 86400000)
    if (diffDays === 1) streak++
    else break
  }
  return streak
}

const STATUS_ORDER: Record<ClientStatus, number> = { inactive: 0, declining: 1, active: 2, new: 3 }

/* ── Hook ── */
export default function useCoachAnalytics(coachId: string | null) {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<ClientAnalytics[]>([])
  const [kpi, setKpi] = useState<CoachAnalyticsKPI>({ totalClients: 0, totalActive: 0, totalDeclining: 0, totalInactive: 0, sessionsThisWeekTotal: 0 })
  const [sortBy, setSortBy] = useState<SortBy>('status')
  const [filterBy, setFilterBy] = useState<FilterBy>('all')

  const fetch7d = daysAgo(7)
  const fetch30d = daysAgo(30)

  const refresh = useCallback(async () => {
    if (!coachId) return
    setLoading(true)

    // 1a. Fetch liens coach_clients
    const { data: coachClientLinks, error: ccError } = await supabase
      .from('coach_clients')
      .select('client_id')
      .eq('coach_id', coachId)

    if (ccError) {
      console.warn('[useCoachAnalytics] coach_clients error:', ccError.message)
      setLoading(false)
      return
    }
    if (!coachClientLinks || coachClientLinks.length === 0) {
      setClients([])
      setKpi({ totalClients: 0, totalActive: 0, totalDeclining: 0, totalInactive: 0, sessionsThisWeekTotal: 0 })
      setLoading(false)
      return
    }

    const clientIds = coachClientLinks.map(cc => cc.client_id)

    // 1b. Fetch profiles séparément (pas de join — FK pointe sur auth.users)
    const { data: rawProfiles, error: profError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, subscription_type, created_at')
      .in('id', clientIds)

    if (profError || !rawProfiles) {
      console.warn('[useCoachAnalytics] profiles error:', profError?.message)
      setLoading(false)
      return
    }

    // 2-4. Fetch en parallèle : sessions 30j, weight 7j, meal tracking 7j
    const [sessionsRes, weightsRes, mealsRes] = await Promise.all([
      supabase
        .from('completed_sessions')
        .select('client_id, completed_at')
        .eq('coach_id', coachId)
        .gte('completed_at', fetch30d),
      supabase
        .from('weight_logs')
        .select('user_id, poids, date')
        .in('user_id', clientIds)
        .gte('date', fetch7d)
        .order('date', { ascending: true }),
      supabase
        .from('meal_tracking')
        .select('user_id, date, is_completed')
        .in('user_id', clientIds)
        .gte('date', fetch7d),
    ])

    // Agréger sessions par client (30j pour streak, 7j pour count)
    const sessionsByClient = new Map<string, string[]>()
    for (const s of (sessionsRes.data || [])) {
      const arr = sessionsByClient.get(s.client_id) || []
      arr.push(s.completed_at)
      sessionsByClient.set(s.client_id, arr)
    }

    // Agréger poids par client
    const weightsByClient = new Map<string, { poids: number; date: string }[]>()
    for (const w of (weightsRes.data || [])) {
      const arr = weightsByClient.get(w.user_id) || []
      arr.push({ poids: w.poids, date: w.date })
      weightsByClient.set(w.user_id, arr)
    }

    // Agréger meal tracking par client
    const mealsByClient = new Map<string, number>()
    for (const m of (mealsRes.data || [])) {
      if (m.is_completed) {
        mealsByClient.set(m.user_id, (mealsByClient.get(m.user_id) || 0) + 1)
      }
    }

    // Calculer les métriques par client
    const now = new Date()
    const analytics: ClientAnalytics[] = rawProfiles.map(p => {
      const cid = p.id
      const allSessions = sessionsByClient.get(cid) || []
      const sessions7d = allSessions.filter(d => d >= fetch7d)
      const weights = weightsByClient.get(cid) || []
      const mealsCompleted = mealsByClient.get(cid) || 0

      // Dernière activité
      const lastSessionDate = allSessions.length > 0
        ? new Date(allSessions.sort((a, b) => b.localeCompare(a))[0])
        : null

      // Streak (sur 30j de données)
      const streak = computeStreak(allSessions)

      // Weight delta 7j
      let weightDelta7d: number | null = null
      if (weights.length >= 2) {
        weightDelta7d = +(weights[weights.length - 1].poids - weights[0].poids).toFixed(1)
      }

      // Meal adherence 7j (28 repas attendus = 7j × 4 repas)
      const mealAdherence7d = Math.round((mealsCompleted / 28) * 100)

      // Statut
      const createdAt = new Date(p.created_at)
      const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / 86400000)
      let status: ClientStatus
      if (daysSinceCreation < 7) {
        status = 'new'
      } else if (!lastSessionDate) {
        status = 'inactive'
      } else {
        const daysSinceLast = Math.floor((now.getTime() - lastSessionDate.getTime()) / 86400000)
        if (daysSinceLast <= 3) status = 'active'
        else if (daysSinceLast <= 7) status = 'declining'
        else status = 'inactive'
      }

      return {
        client_id: cid,
        full_name: p.full_name || 'Sans nom',
        email: p.email || '',
        avatar_url: p.avatar_url || null,
        subscription_type: p.subscription_type || null,
        sessionsLast7d: sessions7d.length,
        weightDelta7d,
        mealAdherence7d,
        streak,
        lastActivity: lastSessionDate,
        status,
      }
    })

    // KPI
    const totalActive = analytics.filter(c => c.status === 'active').length
    const totalDeclining = analytics.filter(c => c.status === 'declining').length
    const totalInactive = analytics.filter(c => c.status === 'inactive').length
    const sessionsThisWeekTotal = analytics.reduce((s, c) => s + c.sessionsLast7d, 0)

    setKpi({
      totalClients: analytics.length,
      totalActive,
      totalDeclining,
      totalInactive,
      sessionsThisWeekTotal,
    })

    setClients(analytics)
    setLoading(false)
  }, [coachId, fetch7d, fetch30d])

  useEffect(() => {
    if (!coachId) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId])

  // Tri + filtre (useMemo pour nouvelle ref à chaque changement)
  const filtered = useMemo(() => {
    const arr = clients.filter(c => filterBy === 'all' || c.status === filterBy)
    return [...arr].sort((a, b) => {
      if (sortBy === 'status') return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name)
      const aTime = a.lastActivity?.getTime() || 0
      const bTime = b.lastActivity?.getTime() || 0
      return bTime - aTime
    })
  }, [clients, sortBy, filterBy])

  return { loading, clients: filtered, kpi, sortBy, setSortBy, filterBy, setFilterBy, refresh }
}
