'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getRole } from '../../../lib/getRole'
import { createCoachClientRelationRepository } from '@/lib/repositories/coach-client-relations'
import { createCalendarClientAdapter } from '@/lib/coaching/calendar'
import type { DatabaseClient } from '@/lib/supabase/types'
import { aggregateCoachRevenue, loadCoachClients, loadCoachSessionSummary, programEligibleClients } from '@/lib/coaching/dashboard'
import { initials, statusFor, type ClientRow, type ScheduledSession } from './coach-dashboard-contract'
import { useCoachDashboardMessaging } from './useCoachDashboardMessaging'

const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

export default function useCoachDashboardController(initialSession?: any) {
  const router = useRouter()
  const [mounted, setMounted]   = useState(false)
  const [session, setSession]   = useState<any>(initialSession || null)
  const [roleChecked, setRoleChecked] = useState(!!initialSession)
  const [clients, setClients]   = useState<ClientRow[]>([])
  const [loading, setLoading]   = useState(!initialSession)
  const [search, setSearch]     = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [section, setSection]   = useState<'accueil' | 'dashboard' | 'suivi' | 'messages' | 'calendar' | 'aliments' | 'profil' | 'programs'>('accueil')
  const [coachProfile, setCoachProfile] = useState<any>(null)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [yearRevenue, setYearRevenue] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [monthPaymentsCount, setMonthPaymentsCount] = useState(0)
  const [activeSubscribers, setActiveSubscribers] = useState(0)
  const [allPayments, setAllPayments] = useState<{ amount: number; paid_at: string }[]>([])
  const [atRiskClients, setAtRiskClients] = useState<any[]>([])
  const [pendingVideoCount, setPendingVideoCount] = useState(0)
  const [lastSessionByClient, setLastSessionByClient] = useState<Map<string, { name: string; completedAt: string }>>(new Map())
  const [sessionsThisWeekByClient, setSessionsThisWeekByClient] = useState<Map<string, number>>(new Map())

  // Food management state
  const [foodList, setFoodList] = useState<any[]>([])
  const [foodFilter, setFoodFilter] = useState<'fitness' | 'anses' | 'coach'>('fitness')
  const [foodSearchQ, setFoodSearchQ] = useState('')
  const [foodLoading, setFoodLoading] = useState(false)
  const [showAddFood, setShowAddFood] = useState(false)
  const [newFood, setNewFood] = useState({ name: '', energy_kcal: '', proteins: '', carbohydrates: '', fat: '', fiber: '', is_cooked: false })

  // Scheduled sessions + calendar
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([])
  const [calWeekOffset, setCalWeekOffset]         = useState(0)
  const [selectedSession, setSelectedSession]     = useState<ScheduledSession | null>(null)

  // New session modal
  const [showNewSession,   setShowNewSession]   = useState(false)
  const [nsClientId,       setNsClientId]       = useState('')
  const [nsDate,           setNsDate]           = useState(() => new Date().toISOString().split('T')[0])
  const [nsStartTime,      setNsStartTime]      = useState('10:00')
  const [nsEndTime,        setNsEndTime]        = useState('11:00')
  const [nsType,           setNsType]           = useState('Force')
  const [nsNotes,          setNsNotes]          = useState('')
  const [nsLocation,       setNsLocation]       = useState('')
  const [nsSaving,         setNsSaving]         = useState('')

  const messagingState = useCoachDashboardMessaging(supabase as DatabaseClient, session?.user?.id, clients)
  const { refreshCounters, ...messagingPublic } = messagingState

  /* ── Derived values ────────────────────────────────────── */

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return clients
    return clients.filter(c => (c.profiles?.full_name ?? '').toLowerCase().includes(q))
  }, [clients, search])

  const coachName = coachProfile?.full_name || session?.user?.user_metadata?.full_name || 'Coach'
  const coachInitials = initials(coachName)
  const activeCount = clients.filter(c => statusFor(c.created_at) === 'active').length

  /* ── Effects ───────────────────────────────────────────── */

  /* ── Auth ── */
  useEffect(() => {
    setMounted(true)
    // If session was passed from parent (page.tsx), skip auth check entirely
    if (initialSession) {
      supabase.from('app_logs').insert({ level: 'info', message: 'COACH_DASH_SKIP_AUTH', details: { userId: initialSession.user?.id }, page_url: '/coach' })
      return
    }
    let alive = true
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      supabase.from('app_logs').insert({ level: 'info', message: 'COACH_DASH_SESSION', details: { hasSession: !!s, userId: s?.user?.id, url: typeof window !== 'undefined' ? window.location.href : '' }, page_url: '/coach' })
      if (alive) { setSession(s); setLoading(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      supabase.from('app_logs').insert({ level: 'info', message: 'COACH_DASH_AUTH_CHANGE', details: { event: _event, hasSession: !!s, userId: s?.user?.id }, page_url: '/coach' })
      if (!alive) return
      if (_event === 'SIGNED_OUT') { setSession(null); setLoading(false); return }
      if (s) { setSession(s); setLoading(false) }
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  // Handle Stripe return + verify account status on load
  useEffect(() => {
    if (!session) return
    const params = new URLSearchParams(window.location.search)
    const uid = session.user.id

    if (params.get('stripe') === 'success') {
      const accountId = params.get('account')
      if (accountId) {
        (async () => {
          await supabase.from('profiles').update({ stripe_account_id: accountId, stripe_onboarding_complete: true }).eq('id', uid)
          window.history.replaceState({}, '', window.location.pathname)
          window.location.reload()
        })()
        return
      }
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [session])

  // Verify real Stripe status and sync to DB
  useEffect(() => {
    if (!coachProfile?.stripe_account_id) return
    if (coachProfile.stripe_onboarding_complete) return
    fetch('/api/stripe/check-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: coachProfile.stripe_account_id }),
    }).then(r => r.json()).then(data => {
      if (data.connected) {
        supabase.from('profiles').update({ stripe_onboarding_complete: true }).eq('id', session!.user.id)
          .then(() => { setCoachProfile((p: any) => p ? { ...p, stripe_onboarding_complete: true } : p) })
      }
    }).catch(() => {})
  }, [coachProfile?.stripe_account_id])

  useEffect(() => {
    if (!session) return

    function loadCoachData() {
      fetchClients(session.user.id)
      supabase.from('exercise_feedback').select('id', { count: 'exact', head: true }).eq('coach_id', session.user.id).eq('status', 'pending').then(({ count }: { count: number | null }) => setPendingVideoCount(count || 0))
      supabase.from('profiles').select('id,full_name,email,stripe_account_id,stripe_onboarding_complete,subscription_price,coach_onboarding_complete,cgu_accepted_at,coach_bio,coach_speciality,coach_experience_years,coach_monthly_rate').eq('id', session.user.id).maybeSingle().then(({ data }) => {
        if (data) {
          if (!data.coach_onboarding_complete) { router.replace('/onboarding-coach'); return }
          setCoachProfile(data)
          supabase.from('payments').select('amount,paid_at').eq('status', 'paid').limit(200).then(({ data: allPayments }) => {
            if (!allPayments) return
            setAllPayments(allPayments as { amount: number; paid_at: string }[])
            const totals = aggregateCoachRevenue(allPayments as { amount: number; paid_at: string }[], new Date())
            setMonthRevenue(totals.monthRevenue); setYearRevenue(totals.yearRevenue); setTotalRevenue(totals.totalRevenue); setMonthPaymentsCount(totals.monthPaymentsCount)
          })
        }
      })
      createCoachClientRelationRepository(supabase).listActiveClientsForCoach(session.user.id, { limit: 100 })
        .then(result => setActiveSubscribers(result.ok ? result.data.length : 0))
    }

    // If initialSession was provided, role already confirmed by page.tsx — skip getRole
    if (initialSession) {
      loadCoachData()
      return
    }

    getRole(session.user.id, session.access_token).then(role => {
      supabase.from('app_logs').insert({ level: 'info', message: 'COACH_DASH_ROLE', details: { role, userId: session.user.id }, page_url: '/coach' })
      if (!role) { setRoleChecked(true); return }
      if (role !== 'coach' && role !== 'super_admin') {
        router.replace('/')
      } else {
        setRoleChecked(true)
        loadCoachData()
      }
    })
  }, [session])

  // Fetch scheduled sessions when in calendar section or week offset changes
  useEffect(() => {
    if (!session?.user?.id) return
    fetchScheduledSessions(session.user.id, calWeekOffset)
  }, [session?.user?.id, calWeekOffset, section])

  /* ── Data fetching ─────────────────────────────────────── */

  async function fetchClients(coachId: string) {
    setLoading(true)
    const relationRepository = createCoachClientRelationRepository(supabase)
    const clientsResult = await loadCoachClients(relationRepository, coachId)
    if (!clientsResult.ok) { setClients([]); setLoading(false); return }
    const rows = clientsResult.data
    const clientIds = rows.map(row => row.client_id)
    setClients(rows)
    setLoading(false)
    void refreshCounters(clientIds)
    fetchAtRiskClients(rows)

    // Fetch completed sessions for all clients of this coach
    loadCoachSessionSummary(supabase as DatabaseClient, coachId, new Date())
      .then(result => {
        if (!result.ok) return
        setLastSessionByClient(result.data.lastSessionByClient)
        setSessionsThisWeekByClient(result.data.sessionsThisWeekByClient)
      })
  }

  async function fetchAtRiskClients(clientRows: ClientRow[]) {
    if (!clientRows.length) { setAtRiskClients([]); return }
    const results: any[] = []
    for (const c of clientRows) {
      const { data } = await supabase
        .from('workout_sessions')
        .select('created_at')
        .eq('user_id', c.client_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const lastDate = data?.created_at ? new Date(data.created_at) : null
      const daysSince = lastDate ? Math.floor((Date.now() - lastDate.getTime()) / 86400000) : 999
      if (daysSince >= 3) {
        results.push({
          id: c.client_id,
          name: c.profiles?.full_name ?? 'Client',
          daysSince,
          lastSession: lastDate,
        })
      }
    }
    results.sort((a, b) => b.daysSince - a.daysSince)
    setAtRiskClients(results)
  }

  async function fetchScheduledSessions(coachId: string, weekOffset = 0) {
    const calendar = createCalendarClientAdapter(supabase, {
      fetcher: fetch,
      clock: { now: () => new Date() },
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich',
    })
    const result = await calendar.listWeekForActor({ userId: coachId, role: 'coach' }, weekOffset, { limit: 100 })
    if (!result.ok) console.warn('[fetchScheduledSessions] unavailable')
    setScheduledSessions(result.ok ? result.data : [])
  }

  /* ── Handlers ──────────────────────────────────────────── */

  async function saveNewSession() {
    if (!session?.user?.id || !nsClientId || !nsDate) return
    setNsSaving('saving')
    const calendar = createCalendarClientAdapter(supabase, {
      fetcher: fetch,
      clock: { now: () => new Date() },
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich',
    })
    const result = await calendar.create({ userId: session.user.id, role: 'coach' }, {
      clientUserId: nsClientId,
      localDate: nsDate,
      startTime: nsStartTime,
      endTime: nsEndTime,
      sessionType: nsType,
      location: nsLocation || null,
      notes: nsNotes || null,
    })
    if (!result.ok) { console.error('[saveNewSession] unavailable'); setNsSaving(''); return }
    setNsSaving('done')
    await fetchScheduledSessions(session.user.id, calWeekOffset)
    setTimeout(() => {
      setShowNewSession(false)
      setNsClientId(''); setNsDate(new Date().toISOString().split('T')[0])
      setNsStartTime('10:00'); setNsEndTime('11:00')
      setNsType('Force'); setNsNotes(''); setNsLocation(''); setNsSaving('')
    }, 800)
  }

  async function deleteSession(id: string) {
    if (!session?.user?.id) return
    const calendar = createCalendarClientAdapter(supabase, {
      fetcher: fetch,
      clock: { now: () => new Date() },
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich',
    })
    const result = await calendar.delete({ userId: session.user.id, role: 'coach' }, id)
    if (!result.ok) { console.error('[deleteSession] unavailable'); return }
    if (session?.user?.id) await fetchScheduledSessions(session.user.id, calWeekOffset)
    setSelectedSession(null)
  }

  // Food management functions
  async function loadFoods() {
    setFoodLoading(true)
    let query = supabase.from('food_items').select('id, name, energy_kcal, proteins, carbohydrates, fat, source').order('name')
    if (foodFilter === 'fitness') query = query.eq('source', 'fitness')
    else if (foodFilter === 'anses') query = query.eq('source', 'ANSES')
    else if (foodFilter === 'coach') query = query.eq('source', 'coach')
    if (foodSearchQ.length >= 2) query = query.ilike('name', `%${foodSearchQ}%`).limit(200)
    else query = query.limit(50)
    const { data } = await query
    setFoodList(data || [])
    setFoodLoading(false)
  }

  async function saveNewFood() {
    if (!newFood.name.trim()) return
    await supabase.from('food_items').insert({
      name: newFood.name.trim(),
      energy_kcal: parseFloat(newFood.energy_kcal) || 0,
      proteins: parseFloat(newFood.proteins) || 0,
      carbohydrates: parseFloat(newFood.carbohydrates) || 0,
      fat: parseFloat(newFood.fat) || 0,
      fiber: newFood.fiber ? parseFloat(newFood.fiber) : null,
      is_cooked: newFood.is_cooked,
      source: 'coach',
    })
    setShowAddFood(false)
    setNewFood({ name: '', energy_kcal: '', proteins: '', carbohydrates: '', fat: '', fiber: '', is_cooked: false })
    loadFoods()
  }

  async function deleteFood(id: string) {
    await supabase.from('food_items').delete().eq('id', id)
    setFoodList(prev => prev.filter(f => f.id !== id))
  }

  async function handleStripeConnect() {
    if (!session?.user?.id || stripeConnecting) return
    setStripeConnecting(true)
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId: session.user.id,
          email: session.user.email,
          existingAccountId: coachProfile?.stripe_account_id || null,
        }),
      })
      const data = await res.json()
      if (data.url) {
        if (data.accountId && data.accountId !== coachProfile?.stripe_account_id) {
          await supabase.from('profiles').update({ stripe_account_id: data.accountId }).eq('id', session.user.id)
        }
        window.location.href = data.url
      } else {
        alert('Erreur Stripe: ' + (data.error || 'Impossible de connecter'))
      }
    } catch {
      alert('Erreur de connexion à Stripe')
    }
    setStripeConnecting(false)
  }

  /* ── Return ────────────────────────────────────────────── */

  return {
    // Auth / loading
    mounted,
    session,
    loading,
    roleChecked,
    supabase,

    // Clients
    clients,
    programClients: programEligibleClients(clients),
    filtered,
    search, setSearch,
    lastSessionByClient,
    sessionsThisWeekByClient,

    // Sections / navigation
    section, setSection,
    router,

    // Coach profile
    coachProfile,
    coachName,
    coachInitials,

    // Stats
    activeCount,
    atRiskClients,
    monthRevenue,
    yearRevenue,
    totalRevenue,
    monthPaymentsCount,
    activeSubscribers,
    allPayments,

    // Invite
    showInvite, setShowInvite,

    // Messaging
    ...messagingPublic,

    // Calendar / sessions
    scheduledSessions,
    calWeekOffset, setCalWeekOffset,
    selectedSession, setSelectedSession,

    // New session modal
    showNewSession, setShowNewSession,
    nsClientId, setNsClientId,
    nsDate, setNsDate,
    nsStartTime, setNsStartTime,
    nsEndTime, setNsEndTime,
    nsType, setNsType,
    nsNotes, setNsNotes,
    nsLocation, setNsLocation,
    nsSaving,
    saveNewSession,
    deleteSession,

    // Food management
    foodList,
    foodFilter, setFoodFilter,
    foodSearchQ, setFoodSearchQ,
    foodLoading,
    showAddFood, setShowAddFood,
    newFood, setNewFood,
    loadFoods,
    saveNewFood,
    deleteFood,

    // Stripe
    stripeConnecting,
    handleStripeConnect,

    // Video reviews
    pendingVideoCount,
  }
}
