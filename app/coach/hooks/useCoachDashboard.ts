'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getRole } from '../../../lib/getRole'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const supabase = createBrowserClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
)

/* ── Types ─────────────────────────────────────────────────── */

export interface ClientRow {
  id: string
  client_id: string
  created_at: string
  invited_by_coach?: boolean
  profiles: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
    current_weight: number | null
    calorie_goal: number | null
  } | null
}

export interface ScheduledSession {
  id: string
  coach_id: string
  client_id: string
  scheduled_at: string
  duration_minutes: number
  session_type: string
  notes: string | null
  status: string
  created_at: string
}

/* ── Constants ─────────────────────────────────────────────── */

export const SESSION_TYPES = ['Force', 'Cardio', 'HIIT', 'Mobilité', 'Récupération']
export const SESSION_COLORS: Record<string, string> = {
  Force: '#D4A843', Cardio: '#E8C97A', HIIT: '#D4A843',
  Mobilité: '#8A8070', Récupération: '#F5EDD8',
}

export const STATUS_META = {
  active:   { label: 'Actif',       cls: 'badge-active'   },
  warning:  { label: 'À relancer',  cls: 'badge-warning'  },
  inactive: { label: 'Inactif',     cls: 'badge-inactive' },
}

/* ── Wheel picker constants ────────────────────────────────── */
export const WP_MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
export const WP_YEARS  = ['2025','2026','2027','2028']
export const WP_DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
export const WP_HOURS  = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
export const WP_MINS   = ['00','05','10','15','20','25','30','35','40','45','50','55']
export const WP_ITEM_H = 44

/* ── Helper functions ──────────────────────────────────────── */

export function getWeekDays(offsetWeeks = 0): Date[] {
  const today = new Date()
  const dow = today.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + offsetWeeks * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })
}

export function initials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

export function statusFor(createdAt: string): 'active' | 'warning' | 'inactive' {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000
  if (days < 30) return 'active'
  if (days < 60) return 'warning'
  return 'inactive'
}

/* ── Hook ──────────────────────────────────────────────────── */

export default function useCoachDashboard(initialSession?: any) {
  const router = useRouter()
  const [mounted, setMounted]   = useState(false)
  const [session, setSession]   = useState<any>(initialSession || null)
  const [roleChecked, setRoleChecked] = useState(!!initialSession)
  const [clients, setClients]   = useState<ClientRow[]>([])
  const [loading, setLoading]   = useState(!initialSession)
  const [search, setSearch]     = useState('')
  const [copied, setCopied]     = useState(false)
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
  const [nsSaving,         setNsSaving]         = useState('')

  // Messaging state
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null)
  const [chatMessages, setChatMessages]     = useState<any[]>([])
  const [msgInput, setMsgInput]             = useState('')
  const [unreadCounts, setUnreadCounts]     = useState<Record<string, number>>({})
  const [lastMessages, setLastMessages]   = useState<Map<string, { content: string; image_url: string | null; created_at: string }>>(new Map())
  const msgEndRef = useRef<HTMLDivElement>(null)

  // Internal refs for polling — avoids stale closures inside setInterval
  const selectedClientRef    = useRef<ClientRow | null>(null)
  const clientsRef           = useRef<ClientRow[]>([])
  const lastChatTimestampRef = useRef<string | null>(null)

  /* ── Derived values ────────────────────────────────────── */

  const totalUnread = Object.values(unreadCounts).reduce((s, n) => s + n, 0)

  const inviteLink = session && typeof window !== 'undefined'
    ? `${window.location.origin}/join?coach=${session.user.id}`
    : ''

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
          const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
          const startOfYear = new Date(startOfMonth.getFullYear(), 0, 1, 0, 0, 0, 0)
          supabase.from('payments').select('amount,paid_at').eq('status', 'paid').limit(200).then(({ data: allPayments }) => {
            if (!allPayments) return
            setAllPayments(allPayments as { amount: number; paid_at: string }[])
            const monthStart = startOfMonth.toISOString()
            const yearStart = startOfYear.toISOString()
            let mRev = 0, yRev = 0, tRev = 0, mCount = 0
            for (const p of allPayments) {
              const amt = p.amount || 0
              tRev += amt
              if (p.paid_at && p.paid_at >= yearStart) yRev += amt
              if (p.paid_at && p.paid_at >= monthStart) { mRev += amt; mCount++ }
            }
            setMonthRevenue(mRev); setYearRevenue(yRev); setTotalRevenue(tRev); setMonthPaymentsCount(mCount)
          })
        }
      })
      supabase.from('coach_clients').select('client_id').eq('coach_id', session.user.id).limit(100).then(({ data: links }) => {
        setActiveSubscribers(links?.length || 0)
      })
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

  // Keep refs in sync with state so polling interval has fresh values
  useEffect(() => { selectedClientRef.current = selectedClient }, [selectedClient])
  useEffect(() => { clientsRef.current = clients }, [clients])
  useEffect(() => {
    const real = chatMessages.filter(m => !String(m.id).startsWith('opt-'))
    if (real.length > 0) lastChatTimestampRef.current = real[real.length - 1].created_at
  }, [chatMessages])

  // Realtime subscription for chat messages (INSERT + UPDATE, filtered server-side)
  useEffect(() => {
    if (!session?.user?.id || !selectedClient) return
    const coachId = session.user.id
    const clientId = selectedClient.client_id

    const handleMessage = (payload: any, type: 'INSERT' | 'UPDATE') => {
      const m = payload.new
      const isThisConv =
        (m.sender_id === coachId && m.receiver_id === clientId) ||
        (m.sender_id === clientId && m.receiver_id === coachId)
      if (!isThisConv) return

      if (type === 'INSERT') {
        setChatMessages(prev => {
          if (prev.some((x: any) => x.id === m.id)) return prev
          return [...prev.filter((x: any) => !String(x.id).startsWith('opt-')), m]
        })
      } else {
        setChatMessages(prev =>
          prev.map((x: any) => x.id === m.id ? { ...x, ...m } : x)
        )
      }
    }

    // Channel A : messages reçus par le coach (INSERT du client + UPDATE)
    const channelIn = supabase
      .channel(`coach-chat-in-${coachId}-${clientId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${coachId}`,
      }, (p: any) => handleMessage(p, 'INSERT'))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${coachId}`,
      }, (p: any) => handleMessage(p, 'UPDATE'))
      .subscribe()

    // Channel B : read receipts sur les messages envoyés par le coach
    const channelOut = supabase
      .channel(`coach-chat-out-${coachId}-${clientId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `sender_id=eq.${coachId}`,
      }, (p: any) => handleMessage(p, 'UPDATE'))
      .subscribe()

    return () => {
      supabase.removeChannel(channelIn)
      supabase.removeChannel(channelOut)
    }
  }, [session?.user?.id, selectedClient?.client_id])

  // Channel global : unread counts + last messages live (toujours actif, indépendant de selectedClient)
  useEffect(() => {
    if (!session?.user?.id) return
    const coachId = session.user.id

    const channel = supabase
      .channel(`coach-global-${coachId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${coachId}`,
      }, (payload: any) => {
        const m = payload.new
        setLastMessages(prev => {
          const next = new Map(prev)
          next.set(m.sender_id, {
            content: m.content,
            image_url: m.image_url,
            created_at: m.created_at,
          })
          return next
        })
        const isOpenConv = selectedClientRef.current?.client_id === m.sender_id
        if (!isOpenConv) {
          setUnreadCounts(prev => ({
            ...prev,
            [m.sender_id]: (prev[m.sender_id] || 0) + 1,
          }))
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${coachId}`,
      }, (payload: any) => {
        const m = payload.new
        if (m.read === true) {
          setUnreadCounts(prev => {
            const cur = prev[m.sender_id] || 0
            if (cur === 0) return prev
            return { ...prev, [m.sender_id]: Math.max(0, cur - 1) }
          })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session?.user?.id])

  // Poll every 2min — fallback resync for unread counts + last messages
  useEffect(() => {
    if (!session?.user?.id) return
    const coachId = session.user.id
    const id = setInterval(async () => {
      const clientIds = clientsRef.current.map(c => c.client_id)
      if (clientIds.length) { fetchUnreadCounts(coachId, clientIds); fetchLastMessages(coachId) }
    }, 120000)
    return () => clearInterval(id)
  }, [session?.user?.id])

  // Scroll to bottom when chat messages update (with image load awareness)
  const chatScrollInitial = useRef(true)
  useEffect(() => {
    if (chatMessages.length === 0) return
    const behavior: ScrollBehavior = chatScrollInitial.current ? 'instant' : 'smooth'

    const scrollToBottom = (b: ScrollBehavior = behavior) => {
      msgEndRef.current?.scrollIntoView({ behavior: b, block: 'end' })
    }

    // Scroll initial après paint
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scrollToBottom()
      chatScrollInitial.current = false
    }))

    // Re-scroll après chargement images
    const container = msgEndRef.current?.parentElement
    const images = container?.querySelectorAll('img') ?? []
    const handlers: Array<() => void> = []
    images.forEach(img => {
      if (img.complete) return
      const onLoad = () => scrollToBottom('instant')
      img.addEventListener('load', onLoad, { once: true })
      img.addEventListener('error', onLoad, { once: true })
      handlers.push(() => {
        img.removeEventListener('load', onLoad)
        img.removeEventListener('error', onLoad)
      })
    })

    return () => handlers.forEach(fn => fn())
  }, [chatMessages.length, selectedClient?.client_id])
  // Reset to instant when conversation changes
  useEffect(() => { chatScrollInitial.current = true }, [selectedClient])

  // Fetch scheduled sessions when in calendar section or week offset changes
  useEffect(() => {
    if (!session?.user?.id) return
    fetchScheduledSessions(session.user.id, calWeekOffset)
  }, [session?.user?.id, calWeekOffset, section])

  /* ── Data fetching ─────────────────────────────────────── */

  async function fetchClients(coachId: string) {
    setLoading(true)
    const { data: links, error: linksError } = await supabase
      .from('coach_clients')
      .select('id, client_id, created_at, invited_by_coach')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (linksError || !links?.length) { setClients([]); setLoading(false); return }

    const clientIds = links.map(l => l.client_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, current_weight, calorie_goal')
      .in('id', clientIds)
      .limit(100)

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
    const rows: ClientRow[] = links.map(l => ({
      id: l.id, client_id: l.client_id, created_at: l.created_at,
      invited_by_coach: l.invited_by_coach ?? false,
      profiles: profileMap[l.client_id] ?? null,
    }))
    setClients(rows)
    setLoading(false)
    fetchUnreadCounts(coachId, clientIds)
    fetchLastMessages(coachId)
    fetchAtRiskClients(rows)

    // Fetch completed sessions for all clients of this coach
    supabase.from('completed_sessions')
      .select('client_id, session_name, completed_at')
      .eq('coach_id', coachId)
      .order('completed_at', { ascending: false })
      .limit(200)
      .then(({ data: completedRows }) => {
        const lsMap = new Map<string, { name: string; completedAt: string }>()
        const swMap = new Map<string, number>()
        const startOfWeek = new Date()
        const dow = startOfWeek.getDay() || 7
        startOfWeek.setDate(startOfWeek.getDate() - (dow - 1))
        startOfWeek.setHours(0, 0, 0, 0)
        for (const row of (completedRows || [])) {
          if (!lsMap.has(row.client_id)) {
            lsMap.set(row.client_id, { name: row.session_name, completedAt: row.completed_at })
          }
          if (new Date(row.completed_at) >= startOfWeek) {
            swMap.set(row.client_id, (swMap.get(row.client_id) || 0) + 1)
          }
        }
        setLastSessionByClient(lsMap)
        setSessionsThisWeekByClient(swMap)
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

  async function fetchUnreadCounts(coachId: string, clientIds: string[]) {
    if (!clientIds.length) return
    const { data } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', coachId)
      .eq('read', false)
      .in('sender_id', clientIds)
      .limit(100)
    const counts: Record<string, number> = {}
    for (const msg of data || []) {
      counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1
    }
    setUnreadCounts(counts)
  }

  async function fetchLastMessages(coachId: string) {
    const { data } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, content, image_url, created_at')
      .or(`sender_id.eq.${coachId},receiver_id.eq.${coachId}`)
      .order('created_at', { ascending: false })
      .limit(200)
    const map = new Map<string, { content: string; image_url: string | null; created_at: string }>()
    for (const msg of (data || [])) {
      const other = msg.sender_id === coachId ? msg.receiver_id : msg.sender_id
      if (!other || map.has(other)) continue
      map.set(other, { content: msg.content || '', image_url: msg.image_url || null, created_at: msg.created_at })
    }
    setLastMessages(map)
  }

  async function fetchScheduledSessions(coachId: string, weekOffset = 0) {
    const days = getWeekDays(weekOffset)
    const from = days[0]; from.setHours(0, 0, 0, 0)
    const to   = days[6]; to.setHours(23, 59, 59, 999)
    const fromStr = from.toISOString().split('T')[0]
    const toStr = to.toISOString().split('T')[0]
    // Query by client IDs (the table uses user_id + scheduled_date, not coach_id + scheduled_at)
    const clientIds = clients.map(c => c.client_id)
    if (!clientIds.length) { setScheduledSessions([]); return }
    const { data, error } = await supabase
      .from('scheduled_sessions')
      .select('*')
      .in('user_id', clientIds)
      .gte('scheduled_date', fromStr)
      .lte('scheduled_date', toStr)
      .order('scheduled_date', { ascending: true })
      .limit(100)
    if (error) console.warn('[fetchScheduledSessions]', error.message)
    setScheduledSessions(data ?? [])
  }

  /* ── Handlers ──────────────────────────────────────────── */

  async function saveNewSession() {
    if (!session?.user?.id || !nsClientId || !nsDate) return
    const start = new Date(`${nsDate}T${nsStartTime}:00`)
    const end   = new Date(`${nsDate}T${nsEndTime}:00`)
    const duration = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000))
    setNsSaving('saving')
    const { error } = await supabase.from('scheduled_sessions').insert({
      client_id: nsClientId,
      coach_id: session.user.id,
      scheduled_at: `${nsDate}T${nsStartTime}:00`,
      session_type: nsType,
      duration_minutes: duration,
      notes: nsNotes || null,
      status: 'scheduled',
    })
    if (error) { console.error('[saveNewSession]', error); setNsSaving(''); return }
    setNsSaving('done')
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: nsClientId, title: 'Nouvelle séance planifiée', body: `${nsType} · ${nsDate} à ${nsStartTime}`, url: '/' }),
    }).catch(() => {})
    await fetchScheduledSessions(session.user.id, calWeekOffset)
    setTimeout(() => {
      setShowNewSession(false)
      setNsClientId(''); setNsDate(new Date().toISOString().split('T')[0])
      setNsStartTime('10:00'); setNsEndTime('11:00')
      setNsType('Force'); setNsNotes(''); setNsSaving('')
    }, 800)
  }

  async function loadChat(clientId: string, coachId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${coachId},receiver_id.eq.${coachId}`)
      .or(`sender_id.eq.${clientId},receiver_id.eq.${clientId}`)
      .order('created_at', { ascending: true })
      .limit(100)
    setChatMessages(data || [])
  }

  async function openChat(client: ClientRow) {
    setSelectedClient(client)
    await loadChat(client.client_id, session.user.id)
    // Mark messages from this client as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', session.user.id)
      .eq('sender_id', client.client_id)
      .eq('read', false)
    setUnreadCounts(prev => ({ ...prev, [client.client_id]: 0 }))
  }

  async function sendMessage(imageUrl?: string | null) {
    if ((!msgInput.trim() && !imageUrl) || !selectedClient || !session) return
    const content = msgInput.trim()
    setMsgInput('')
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: session.user.id,
      receiver_id: selectedClient.client_id,
      content,
      image_url: imageUrl || null,
      read: false,
      created_at: new Date().toISOString(),
    }
    setChatMessages(prev => [...prev, optimistic])
    const row: Record<string, unknown> = { sender_id: session.user.id, receiver_id: selectedClient.client_id, content }
    if (imageUrl) row.image_url = imageUrl
    await supabase.from('messages').insert(row)
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedClient.client_id, title: 'Nouveau message', body: imageUrl ? '📷 Photo' : content.slice(0, 80), url: '/' }),
    }).catch(() => {})
    // Replace optimistic with real server row
    loadChat(selectedClient.client_id, session.user.id)
  }

  function copyInviteLink() {
    if (!inviteLink) return
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteLink).catch(() => fallbackCopy(inviteLink))
    } else { fallbackCopy(inviteLink) }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function fallbackCopy(text: string) {
    const el = document.createElement('textarea')
    el.value = text; el.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(el); el.focus(); el.select()
    document.execCommand('copy'); document.body.removeChild(el)
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
    inviteLink,
    copied,
    copyInviteLink,

    // Messaging
    selectedClient, setSelectedClient,
    chatMessages,
    msgInput, setMsgInput,
    unreadCounts,
    lastMessages,
    totalUnread,
    msgEndRef,
    openChat,
    sendMessage,

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
    nsSaving,
    saveNewSession,

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
