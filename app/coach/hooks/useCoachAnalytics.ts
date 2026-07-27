'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { computeStreak } from '../../../lib/streak'
import { createCoachClientRelationRepository } from '@/lib/repositories/coach-client-relations'
import {
  aggregateCoachMealAdherence,
  isCurrentCoachAnalyticsResponse,
  resolveCoachMealAdherenceRead,
  settleCoachMealTrackingRead,
  type CoachMealAdherence,
  type CoachMealAdherenceStatus,
} from '@/lib/coaching/dashboard/meal-adherence'

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
  mealAdherence7d: number | null
  mealAdherenceStatus: CoachMealAdherenceStatus
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

const STATUS_ORDER: Record<ClientStatus, number> = { inactive: 0, declining: 1, active: 2, new: 3 }

/* ── Hook ── */
export default function useCoachAnalytics(coachId: string | null) {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<ClientAnalytics[]>([])
  const [kpi, setKpi] = useState<CoachAnalyticsKPI>({ totalClients: 0, totalActive: 0, totalDeclining: 0, totalInactive: 0, sessionsThisWeekTotal: 0 })
  const [sortBy, setSortBy] = useState<SortBy>('status')
  const [filterBy, setFilterBy] = useState<FilterBy>('all')
  const coachAnalyticsRequest = useRef(0)
  const activeCoachId = useRef(coachId)
  const confirmedMealAdherence = useRef<{
    coachId: string
    values: ReadonlyMap<string, CoachMealAdherence>
  } | null>(null)

  const fetch7d = daysAgo(7)
  const fetch30d = daysAgo(30)

  const refresh = useCallback(async () => {
    if (!coachId) return
    const request = ++coachAnalyticsRequest.current
    const responseIsCurrent = () => isCurrentCoachAnalyticsResponse(
      request,
      coachAnalyticsRequest.current,
      coachId,
      activeCoachId.current,
    )
    setLoading(true)

    // 1. Fetch active relationships, then the explicit cross-profile projection.
    const relationRepository = createCoachClientRelationRepository(supabase)
    const relations = await relationRepository.listActiveClientsForCoach(coachId, { limit: 100 })
    if (!responseIsCurrent()) return
    if (!relations.ok) {
      console.warn('[useCoachAnalytics] active relations unavailable')
      setLoading(false)
      return
    }
    if (relations.data.length === 0) {
      confirmedMealAdherence.current = null
      setClients([])
      setKpi({ totalClients: 0, totalActive: 0, totalDeclining: 0, totalInactive: 0, sessionsThisWeekTotal: 0 })
      setLoading(false)
      return
    }

    const relatedClientIds = relations.data.map(relation => relation.client_id)
    const profilesResult = await relationRepository.listActiveRelatedProfiles(relatedClientIds, { limit: 100 })
    if (!responseIsCurrent()) return
    if (!profilesResult.ok) {
      console.warn('[useCoachAnalytics] related profiles unavailable')
      setLoading(false)
      return
    }
    const rawProfiles = profilesResult.data.filter(
      (profile): profile is typeof profile & { id: string; created_at: string } =>
        typeof profile.id === 'string' && typeof profile.created_at === 'string',
    )
    const clientIds = rawProfiles.map(profile => profile.id)

    // 2-4. Fetch en parallèle : sessions 30j, weight 7j, meal tracking 7j
    const mealTrackingRead = Promise.resolve(
      supabase
        .from('meal_tracking')
        .select('user_id, date, completed')
        .in('user_id', clientIds)
        .gte('date', fetch7d),
    ).catch(error => ({ data: null, error }))
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
      mealTrackingRead,
    ])
    if (!responseIsCurrent()) return

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

    // Agréger meal tracking par client sans transformer une panne en zéro.
    const settledMealTracking = settleCoachMealTrackingRead(mealsRes.data, mealsRes.error)
    const previousMealAdherence = confirmedMealAdherence.current?.coachId === coachId
      ? confirmedMealAdherence.current.values
      : undefined
    const confirmedValues = settledMealTracking.status === 'success'
      ? aggregateCoachMealAdherence(settledMealTracking.rows, clientIds, fetch7d)
      : null
    const mealAdherence = confirmedValues
      ? { status: 'confirmed' as const, values: confirmedValues }
      : resolveCoachMealAdherenceRead(
          settledMealTracking,
          clientIds,
          fetch7d,
          previousMealAdherence,
        )
    if (mealAdherence.status === 'confirmed') {
      confirmedMealAdherence.current = {
        coachId,
        values: mealAdherence.values,
      }
    }

    // Calculer les métriques par client
    const now = new Date()
    const analytics: ClientAnalytics[] = rawProfiles.map(p => {
      const cid = p.id
      const allSessions = sessionsByClient.get(cid) || []
      const sessions7d = allSessions.filter(d => d >= fetch7d)
      const weights = weightsByClient.get(cid) || []
      const clientMealAdherence = mealAdherence.values.get(cid) ?? {
        status: 'unavailable' as const,
        completedMeals: null,
        observedMeals: null,
        percentage: null,
      }

      // Dernière activité
      const lastSessionDate = allSessions.length > 0
        ? new Date(allSessions.sort((a, b) => b.localeCompare(a))[0])
        : null

      // Streak (sur 30j de données) — moteur unifié lib/streak.ts, normalisation UTC
      const normalizedDates = allSessions.map(d => d.split('T')[0])
      const todayUTC = new Date().toISOString().split('T')[0]
      const streak = computeStreak(normalizedDates, todayUTC).current

      // Weight delta 7j
      let weightDelta7d: number | null = null
      if (weights.length >= 2) {
        weightDelta7d = +(weights[weights.length - 1].poids - weights[0].poids).toFixed(1)
      }

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
        mealAdherence7d: clientMealAdherence.percentage,
        mealAdherenceStatus: clientMealAdherence.status,
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

    if (!responseIsCurrent()) return
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
    activeCoachId.current = coachId
    coachAnalyticsRequest.current += 1
    confirmedMealAdherence.current = null
    setClients([])
    setKpi({ totalClients: 0, totalActive: 0, totalDeclining: 0, totalInactive: 0, sessionsThisWeekTotal: 0 })
    if (!coachId) {
      setLoading(false)
      return
    }
    refresh()
    return () => {
      coachAnalyticsRequest.current += 1
    }
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
