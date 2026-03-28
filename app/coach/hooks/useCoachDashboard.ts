'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getRole } from '../../../lib/getRole'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/* ── Types ─────────────────────────────────────────────────── */

export interface ClientRow {
  id: string
  client_id: string
  created_at: string
  profiles: {
    id: string
    full_name: string | null
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
  Force: '#F97316', Cardio: '#EF4444', HIIT: '#8B5CF6',
  Mobilité: '#22C55E', Récupération: '#3B82F6',
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

export default function useCoachDashboard() {
  const router = useRouter()
  const [mounted, setMounted]   = useState(false)
  const [session, setSession]   = useState<any>(null)
  const [clients, setClients]   = useState<ClientRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [copied, setCopied]     = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [section, setSection]   = useState<'dashboard' | 'messages' | 'calendar' | 'aliments' | 'profil'>('dashboard')
  const [coachProfile, setCoachProfile] = useState<any>(null)
  const [stripeConnecting, setStripeConnecting] = useState(false)
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [yearRevenue, setYearRevenue] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [monthPaymentsCount, setMonthPaymentsCount] = useState(0)
  const [activeSubscribers, setActiveSubscribers] = useState(0)

  // Food management state
  const [foodList, setFoodList] = useState<any[]>([])
  const [foodFilter, setFoodFilter] = useState<'all' | 'ciqual' | 'coach'>('all')
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

  const coachName = session?.user?.user_metadata?.full_name || session?.user?.email || 'Coach'
  const coachInitials = initials(coachName)
  const activeCount = clients.filter(c => statusFor(c.created_at) === 'active').length

  /* ── Effects ───────────────────────────────────────────── */

  /* ── Auth ── */
  useEffect(() => {
    setMounted(true)
    let alive = true
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      supabase.from('app_logs').insert({ level: 'info', message: 'COACH_DASH_SESSION', details: { hasSession: !!s, userId: s?.user?.id, url: typeof window !== 'undefined' ? window.location.href : '' }, page_url: '/coach' })
      if (alive) { setSession(s); setLoading(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      supabase.from('app_logs').insert({ level: 'info', message: 'COACH_DASH_AUTH_CHANGE', details: { event: _event, hasSession: !!s, userId: s?.user?.id }, page_url: '/coach' })
      if (alive) { setSession(s); if (s) setLoading(false) }
    })
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session) return
    getRole(session.user.id, session.access_token).then(role => {
      if (role !== 'coach' && role !== 'super_admin') {
        router.replace('/')
      } else {
        fetchClients(session.user.id)
        // Fetch coach profile with Stripe info
        supabase.from('profiles').select('id,full_name,email,stripe_account_id,stripe_onboarding_complete,subscription_price,coach_onboarding_complete,cgu_accepted_at,coach_bio,coach_speciality,coach_experience_years').eq('id', session.user.id).single().then(({ data }) => {
          if (data) {
            // Gate: redirect to coach-signup if onboarding not complete
            if (!data.coach_onboarding_complete) { router.replace('/coach-signup'); return }
            setCoachProfile(data)
            // Fetch revenue: month, year, total
            const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
            const startOfYear = new Date(startOfMonth.getFullYear(), 0, 1, 0, 0, 0, 0)
            supabase.from('payments').select('amount,paid_at').eq('status', 'paid').then(({ data: allPayments }) => {
              if (!allPayments) return
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
        // Fetch total clients count (all linked to this coach)
        supabase.from('coach_clients').select('client_id').eq('coach_id', session.user.id).then(({ data: links }) => {
          setActiveSubscribers(links?.length || 0)
        })
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

  // Poll every 3s — unread counts + new chat messages (replaces WebSocket)
  useEffect(() => {
    if (!session?.user?.id) return
    const coachId = session.user.id
    const id = setInterval(async () => {
      // Always refresh unread counts
      const clientIds = clientsRef.current.map(c => c.client_id)
      if (clientIds.length) fetchUnreadCounts(coachId, clientIds)

      // Fetch new chat messages for the open conversation
      const client = selectedClientRef.current
      const since  = lastChatTimestampRef.current
      if (!client || !since) return
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${coachId},receiver_id.eq.${coachId}`)
        .or(`sender_id.eq.${client.client_id},receiver_id.eq.${client.client_id}`)
        .gt('created_at', since)
        .order('created_at', { ascending: true })
      if (data?.length) {
        setChatMessages(prev => [...prev.filter(m => !String(m.id).startsWith('opt-')), ...data])
      }
    }, 3000)
    return () => clearInterval(id)
  }, [session?.user?.id])

  // Scroll to bottom when chat messages update
  useEffect(() => {
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [chatMessages])

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
      .select('id, client_id, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })

    if (linksError || !links?.length) { setClients([]); setLoading(false); return }

    const clientIds = links.map(l => l.client_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, current_weight, calorie_goal')
      .in('id', clientIds)

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
    const rows: ClientRow[] = links.map(l => ({
      id: l.id, client_id: l.client_id, created_at: l.created_at,
      profiles: profileMap[l.client_id] ?? null,
    }))
    setClients(rows)
    setLoading(false)
    fetchUnreadCounts(coachId, clientIds)
  }

  async function fetchUnreadCounts(coachId: string, clientIds: string[]) {
    if (!clientIds.length) return
    const { data } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', coachId)
      .eq('read', false)
      .in('sender_id', clientIds)
    const counts: Record<string, number> = {}
    for (const msg of data || []) {
      counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1
    }
    setUnreadCounts(counts)
  }

  async function fetchScheduledSessions(coachId: string, weekOffset = 0) {
    const days = getWeekDays(weekOffset)
    const from = days[0]; from.setHours(0, 0, 0, 0)
    const to   = days[6]; to.setHours(23, 59, 59, 999)
    const { data } = await supabase
      .from('scheduled_sessions')
      .select('*')
      .eq('coach_id', coachId)
      .gte('scheduled_at', from.toISOString())
      .lte('scheduled_at', to.toISOString())
      .order('scheduled_at', { ascending: true })
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
      coach_id: session.user.id,
      client_id: nsClientId,
      scheduled_at: start.toISOString(),
      duration_minutes: duration,
      session_type: nsType,
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

  async function sendMessage() {
    if (!msgInput.trim() || !selectedClient || !session) return
    const content = msgInput.trim()
    setMsgInput('')
    // Optimistic update — show immediately
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: session.user.id,
      receiver_id: selectedClient.client_id,
      content,
      read: false,
      created_at: new Date().toISOString(),
    }
    setChatMessages(prev => [...prev, optimistic])
    await supabase.from('messages').insert({
      sender_id: session.user.id,
      receiver_id: selectedClient.client_id,
      content,
    })
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedClient.client_id, title: 'Nouveau message', body: content.slice(0, 80), url: '/' }),
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
    if (foodFilter === 'coach') query = query.eq('source', 'coach')
    else if (foodFilter === 'ciqual') query = query.or('source.eq.ciqual,source.is.null')
    if (foodSearchQ.length >= 2) query = query.ilike('name', `%${foodSearchQ}%`)
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
        body: JSON.stringify({ coachId: session.user.id }),
      })
      const { url, error } = await res.json()
      if (url) window.location.href = url
      else console.error('Stripe connect error:', error)
    } catch (err) {
      console.error('Stripe connect error:', err)
    }
    setStripeConnecting(false)
  }

  /* ── Return ────────────────────────────────────────────── */

  return {
    // Auth / loading
    mounted,
    session,
    loading,
    supabase,

    // Clients
    clients,
    filtered,
    search, setSearch,

    // Sections / navigation
    section, setSection,
    router,

    // Coach profile
    coachProfile,
    coachName,
    coachInitials,

    // Stats
    activeCount,
    monthRevenue,
    yearRevenue,
    totalRevenue,
    monthPaymentsCount,
    activeSubscribers,

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
  }
}
