'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import {
  Zap, Users, CalendarCheck, Euro, TrendingUp, Minus,
  Search, ChevronRight, ChevronLeft, UserPlus, Dumbbell, Calendar,
  LogOut, Copy, Check, ExternalLink, MessageCircle, Send, ArrowLeft,
  X, Clock, Plus, Flame, Activity, Moon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { getRole } from '../../lib/getRole'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ClientRow {
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

interface ScheduledSession {
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

const SESSION_TYPES = ['Force', 'Cardio', 'HIIT', 'Mobilité', 'Récupération']
const SESSION_COLORS: Record<string, string> = {
  Force: '#F97316', Cardio: '#EF4444', HIIT: '#8B5CF6',
  Mobilité: '#22C55E', Récupération: '#3B82F6',
}

function getWeekDays(offsetWeeks = 0): Date[] {
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

function initials(name: string | null | undefined) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function statusFor(createdAt: string): 'active' | 'warning' | 'inactive' {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000
  if (days < 30) return 'active'
  if (days < 60) return 'warning'
  return 'inactive'
}

const STATUS_META = {
  active:   { label: 'Actif',       cls: 'badge-active'   },
  warning:  { label: 'À relancer',  cls: 'badge-warning'  },
  inactive: { label: 'Inactif',     cls: 'badge-inactive' },
}

export default function CoachPage() {
  const router = useRouter()
  const [mounted, setMounted]   = useState(false)
  const [session, setSession]   = useState<any>(null)
  const [clients, setClients]   = useState<ClientRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [copied, setCopied]     = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [section, setSection]   = useState<'dashboard' | 'messages' | 'calendar' | 'profil'>('dashboard')

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
  // Refs for polling — avoids stale closures inside setInterval
  const selectedClientRef    = useRef<ClientRow | null>(null)
  const clientsRef           = useRef<ClientRow[]>([])
  const lastChatTimestampRef = useRef<string | null>(null)

  const totalUnread = Object.values(unreadCounts).reduce((s, n) => s + n, 0)

  const inviteLink = session && typeof window !== 'undefined'
    ? `${window.location.origin}/join?coach=${session.user.id}`
    : ''

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setLoading(false); return }
    getRole(session.user.id, session.access_token).then(role => {
      if (role !== 'coach' && role !== 'super_admin') {
        router.replace('/')
      } else {
        fetchClients(session.user.id)
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
    // Replace optimistic with real server row
    loadChat(selectedClient.client_id, session.user.id)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return clients
    return clients.filter(c => (c.profiles?.full_name ?? '').toLowerCase().includes(q))
  }, [clients, search])

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

  if (!mounted) return null

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Barlow, sans-serif' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@300;400;500;600;700&display=swap');`}</style>
        <div style={{ width: '100%', maxWidth: '440px', background: '#1F2937', padding: '40px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', background: '#F97316', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={24} color="#fff" strokeWidth={2.5} />
            </div>
          </div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC', textAlign: 'center', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>FITPRO Coach</h1>
          <p style={{ color: '#9CA3AF', textAlign: 'center', fontSize: '0.9rem', marginBottom: '32px' }}>Connecte-toi pour accéder au tableau de bord</p>
          <Auth supabaseClient={supabase}
            appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#F97316', brandAccent: '#EA580C' } } } }}
            theme="dark" providers={['google']} />
        </div>
      </div>
    )
  }

  const coachName = session.user.user_metadata?.full_name || session.user.email || 'Coach'
  const coachInitials = initials(coachName)
  const activeCount = clients.filter(c => statusFor(c.created_at) === 'active').length

  return (
    <div style={{ minHeight: '100vh', background: '#111827', color: '#F8FAFC', fontFamily: 'Barlow, sans-serif', overflowX: 'hidden', maxWidth: '100vw' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #1F2937; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        .stat-card { background: #1F2937; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: box-shadow 200ms ease; cursor: default; }
        .stat-card:hover { box-shadow: 0 10px 15px rgba(0,0,0,0.15); }
        .sidebar-card { background: #1F2937; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.15rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #F8FAFC; margin: 0 0 16px 0; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table thead th { font-family: 'Barlow Condensed', sans-serif; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #9CA3AF; padding: 10px 16px; text-align: left; border-bottom: 1px solid #374151; }
        .data-table tbody tr { border-bottom: 1px solid #1F2937; transition: background 150ms ease; cursor: pointer; }
        .data-table tbody tr:hover { background: #374151; }
        .data-table tbody td { padding: 14px 16px; font-size: 0.9rem; color: #F8FAFC; }
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
        .badge-active   { background: rgba(34,197,94,0.15);   color: #22C55E; }
        .badge-warning  { background: rgba(249,115,22,0.15);  color: #F97316; }
        .badge-inactive { background: rgba(156,163,175,0.12); color: #9CA3AF; }
        .avatar-circle { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #F97316, #FB923C); display: flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.85rem; color: #fff; flex-shrink: 0; }
        .btn-primary { display: flex; align-items: center; gap: 8px; background: #22C55E; color: #fff; padding: 11px 20px; border-radius: 8px; font-family: 'Barlow Condensed', sans-serif; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.04em; border: none; cursor: pointer; transition: opacity 200ms ease, transform 200ms ease; width: 100%; justify-content: center; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary-orange { background: #F97316; }
        .btn-secondary { display: flex; align-items: center; gap: 8px; background: transparent; color: #F97316; border: 2px solid #F97316; padding: 9px 20px; border-radius: 8px; font-family: 'Barlow Condensed', sans-serif; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.04em; cursor: pointer; transition: background 200ms ease, color 200ms ease; width: 100%; justify-content: center; }
        .btn-secondary:hover { background: #F97316; color: #fff; }
        .btn-ghost { display: flex; align-items: center; gap: 6px; background: transparent; color: #9CA3AF; border: none; padding: 8px 12px; border-radius: 8px; font-family: 'Barlow', sans-serif; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 150ms ease, color 150ms ease; white-space: nowrap; }
        .btn-ghost:hover { background: #374151; color: #F8FAFC; }
        .divider { border: none; border-top: 1px solid #374151; margin: 16px 0; }
        .search-input { background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 7px 12px 7px 32px; font-family: 'Barlow', sans-serif; font-size: 0.85rem; color: #F8FAFC; width: 180px; transition: border-color 200ms ease; outline: none; }
        .search-input:focus { border-color: #F97316; }
        .invite-panel { background: rgba(249,115,22,0.07); border: 1px solid rgba(249,115,22,0.25); border-radius: 12px; padding: 16px; margin-top: 12px; }
        .client-chat-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #374151; cursor: pointer; transition: background 150ms; }
        .client-chat-row:hover { background: #374151; }
        .client-chat-row.active { background: rgba(249,115,22,0.1); border-left: 3px solid #F97316; }
        .msg-input { flex: 1; background: #111827; border: 1px solid #374151; border-radius: 24px; padding: 10px 18px; font-family: 'Barlow', sans-serif; font-size: 0.9rem; color: #F8FAFC; outline: none; transition: border-color 200ms; }
        .msg-input:focus { border-color: #F97316; }
        @media (max-width: 640px) { .hide-sm { display: none !important; } }
        @media (max-width: 1024px) { .lg-grid { grid-template-columns: 1fr !important; } }
        /* ── MOBILE STATS 2×2 ── */
        @media (max-width: 767px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }
        /* ── CLIENT CARDS (mobile) ── */
        .client-cards-m { display: none; flex-direction: column; gap: 10px; }
        @media (max-width: 767px) {
          .client-table-wrap { display: none !important; }
          .client-cards-m { display: flex; }
        }
        .client-card-m { background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 14px; cursor: pointer; transition: border-color 150ms; overflow: hidden; }
        .client-card-m:active { border-color: #F97316; }
        .client-card-m-inner { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .avatar-circle-lg { width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, #F97316, #FB923C); display: flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 1.05rem; color: #fff; flex-shrink: 0; }
        .client-card-info { flex: 1; min-width: 0; }
        .client-card-name { font-weight: 600; font-size: 0.95rem; color: #F8FAFC; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .client-card-sub { font-size: 0.72rem; color: #6B7280; margin-top: 4px; }
        .client-card-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .client-card-msg-btn { position: relative; background: transparent; border: none; cursor: pointer; padding: 8px; color: #6B7280; display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: 8px; transition: color 150ms; }
        .client-card-msg-btn:active { color: #F97316; }
        .msg-badge { position: absolute; top: 4px; right: 4px; min-width: 16px; height: 16px; background: #EF4444; border-radius: 8px; font-size: 0.6rem; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
        /* ── BOTTOM NAV ── */
        .bottom-nav { display: none; }
        @media (max-width: 767px) {
          .bottom-nav {
            display: flex; position: fixed; bottom: 0; left: 0; right: 0;
            background: #111827; border-top: 1px solid #1F2937;
            padding: 8px 0; padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
            z-index: 100;
          }
          .section-pad { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important; }
        }
        .bottom-nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: transparent; border: none; cursor: pointer; padding: 4px 8px; color: #6B7280; transition: color 150ms; position: relative; min-height: 44px; justify-content: center; }
        .bottom-nav-btn.active { color: #F97316; }
        .bottom-nav-label { font-family: 'Barlow Condensed', sans-serif; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
        .nav-badge { position: absolute; top: 2px; right: calc(50% - 20px); min-width: 16px; height: 16px; background: #EF4444; border-radius: 8px; font-size: 0.6rem; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
        /* ── CHAT FULL-SCREEN OVERLAY ── */
        .chat-fullscreen { position: fixed; inset: 0; background: #111827; z-index: 200; display: flex; flex-direction: column; overflow: hidden; width: 100vw; height: 100vh; }
        .cal-day-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 0 8px; }
        .cal-day-label { display: inline-flex; align-items: baseline; gap: 6px; border-radius: 8px; padding: 4px 10px; }
        .cal-day-label.today { background: rgba(249,115,22,0.12); border: 1px solid rgba(249,115,22,0.3); }
        .cal-session-card { background: #1A1A1A; border-radius: 12px; padding: 12px 14px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 150ms; min-height: 64px; }
        .cal-session-card:hover { background: #222; }
        .cal-empty { padding: 10px 14px; color: #4B5563; font-size: 0.78rem; font-style: italic; background: #111827; border-radius: 10px; border: 1px solid #1F2937; }
        .cal-add-day { display: flex; align-items: center; gap: 4px; background: transparent; border: 1px dashed #374151; border-radius: 8px; padding: 6px 10px; color: #6B7280; cursor: pointer; font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 600; min-height: 36px; transition: border-color 150ms, color 150ms; }
        .cal-add-day:hover { border-color: #F97316; color: #F97316; }
        .dashboard-back { display: none; }
        @media (min-width: 640px) { .dashboard-back { display: flex; } }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
        .modal-box { background: #1F2937; border-radius: 16px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
        .form-label { font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #9CA3AF; display: block; margin-bottom: 6px; }
        .form-input { width: 100%; background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 10px 14px; font-family: 'Barlow', sans-serif; font-size: 0.9rem; color: #F8FAFC; outline: none; transition: border-color 200ms; }
        .form-input:focus { border-color: #F97316; }
        .type-chip { border-radius: 8px; padding: 7px 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em; cursor: pointer; border: 2px solid transparent; transition: all 150ms; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ background: '#1F2937', borderBottom: '1px solid #374151', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '32px', height: '32px', background: '#F97316', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.08em' }}>FITPRO</span>
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Messages toggle */}
            <button
              onClick={() => setSection(s => s === 'messages' ? 'dashboard' : 'messages')}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, background: section === 'messages' ? 'rgba(249,115,22,0.15)' : 'transparent', color: section === 'messages' ? '#F97316' : '#9CA3AF', border: section === 'messages' ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.04em', transition: 'all 200ms' }}
            >
              <MessageCircle size={16} strokeWidth={2} />
              <span className="hide-sm">Messages</span>
              {totalUnread > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, background: '#EF4444', borderRadius: 9, fontSize: '0.65rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </button>

            <div className="hide-sm" style={{ width: '1px', height: '24px', background: '#374151' }} />
            <div className="hide-sm" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="avatar-circle">{coachInitials}</div>
              <span style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: '#D1D5DB' }}>{coachName}</span>
            </div>
            <div className="hide-sm" style={{ width: '1px', height: '24px', background: '#374151' }} />
            <button className="btn-ghost" onClick={() => supabase.auth.signOut()} aria-label="Se déconnecter">
              <LogOut size={15} strokeWidth={2} />
              <span className="hide-sm">Déconnexion</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ══════════════ NEW SESSION MODAL ══════════════ */}
      {showNewSession && (
        <div className="modal-bg" onClick={() => setShowNewSession(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #374151' }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F8FAFC', margin: 0 }}>Nouvelle séance</h2>
              <button onClick={() => setShowNewSession(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}><X size={18} /></button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Client */}
              <div>
                <label className="form-label">Client *</label>
                <select value={nsClientId} onChange={e => setNsClientId(e.target.value)} className="form-input" style={{ cursor: 'pointer' }}>
                  <option value="">Sélectionner un client…</option>
                  {clients.map(c => (
                    <option key={c.client_id} value={c.client_id}>{c.profiles?.full_name ?? c.client_id}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="form-label">Date *</label>
                <input type="date" value={nsDate} onChange={e => setNsDate(e.target.value)} className="form-input" />
              </div>

              {/* Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Début</label>
                  <input type="time" value={nsStartTime} onChange={e => setNsStartTime(e.target.value)} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Fin</label>
                  <input type="time" value={nsEndTime} onChange={e => setNsEndTime(e.target.value)} className="form-input" />
                </div>
              </div>

              {/* Duration preview */}
              {nsStartTime && nsEndTime && (() => {
                const start = new Date(`2000-01-01T${nsStartTime}`)
                const end   = new Date(`2000-01-01T${nsEndTime}`)
                const mins  = Math.round((end.getTime() - start.getTime()) / 60000)
                return mins > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF', fontSize: '0.78rem' }}>
                    <Clock size={13} />
                    <span>{mins} min</span>
                  </div>
                ) : null
              })()}

              {/* Session type */}
              <div>
                <label className="form-label">Type de séance</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SESSION_TYPES.map(t => {
                    const color = SESSION_COLORS[t]
                    const active = nsType === t
                    return (
                      <button
                        key={t} onClick={() => setNsType(t)}
                        className="type-chip"
                        style={{
                          background: active ? `${color}22` : 'transparent',
                          borderColor: active ? color : '#374151',
                          color: active ? color : '#9CA3AF',
                        }}
                      >{t}</button>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">Notes (optionnel)</label>
                <textarea
                  value={nsNotes} onChange={e => setNsNotes(e.target.value)}
                  rows={3} placeholder="Objectifs, exercices prévus…"
                  className="form-input" style={{ resize: 'vertical', minHeight: 80 }}
                />
              </div>

              {/* Save */}
              <button
                onClick={saveNewSession}
                disabled={!nsClientId || !nsDate || nsSaving === 'saving'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: nsSaving === 'done' ? '#22C55E' : '#F97316',
                  color: '#fff', border: 'none', borderRadius: 10, padding: '13px 20px',
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
                  opacity: (!nsClientId || !nsDate) ? 0.5 : 1, transition: 'background 200ms',
                }}
              >
                {nsSaving === 'done' ? <><Check size={16} /> Enregistré !</> : nsSaving === 'saving' ? 'Enregistrement…' : <><Plus size={16} /> Créer la séance</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ SESSION DETAIL MODAL ══════════════ */}
      {selectedSession && (() => {
        const clientName = clients.find(c => c.client_id === selectedSession.client_id)?.profiles?.full_name ?? 'Client'
        const color = SESSION_COLORS[selectedSession.session_type] ?? '#F97316'
        const dt = new Date(selectedSession.scheduled_at)
        return (
          <div className="modal-bg" onClick={() => setSelectedSession(null)}>
            <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
              <div style={{ height: 6, background: color, borderRadius: '16px 16px 0 0' }} />
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color, letterSpacing: '0.08em' }}>{selectedSession.session_type}</span>
                    <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', margin: '4px 0 0' }}>{clientName}</h3>
                  </div>
                  <button onClick={() => setSelectedSession(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}><X size={16} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', color: '#9CA3AF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={14} />
                    <span>{format(dt, 'EEEE d MMMM yyyy', { locale: fr })}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={14} />
                    <span>{format(dt, 'HH:mm', { locale: fr })} · {selectedSession.duration_minutes} min</span>
                  </div>
                  {selectedSession.notes && (
                    <div style={{ background: '#111827', borderRadius: 8, padding: '10px 14px', color: '#D1D5DB', marginTop: 4 }}>
                      {selectedSession.notes}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  style={{ marginTop: 20, width: '100%', background: '#374151', color: '#F8FAFC', border: 'none', borderRadius: 8, padding: '10px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
                >Fermer</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ══════════════ CALENDAR SECTION ══════════════ */}
      {section === 'calendar' && (() => {
        const days = getWeekDays(calWeekOffset)
        const todayStr = new Date().toISOString().split('T')[0]
        const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
        const TYPE_ICONS: Record<string, React.ReactNode> = {
          Force: <Dumbbell size={15} />, Cardio: <Flame size={15} />,
          HIIT: <Zap size={15} />, Mobilité: <Activity size={15} />, Récupération: <Moon size={15} />,
        }
        return (
          <div className="section-pad" style={{ width: '100%', maxWidth: '680px', margin: '0 auto', overflowX: 'hidden', paddingBottom: 100 }}>

            {/* ── Sticky week nav header ── */}
            <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#111827', borderBottom: '1px solid #1F2937', padding: '12px 16px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.05em', color: '#F8FAFC', margin: 0 }}>CALENDRIER</h1>
                <button
                  onClick={() => setCalWeekOffset(0)}
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.78rem', fontWeight: 700, color: '#F97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}
                >Aujourd'hui</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setCalWeekOffset(o => o - 1)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: '#1F2937', border: '1px solid #374151', borderRadius: 10, padding: '9px 12px', color: '#9CA3AF', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 600, minHeight: 44 }}
                ><ChevronLeft size={14} /> Précédente</button>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 600, color: '#9CA3AF', textAlign: 'center', flexShrink: 0, minWidth: 110 }}>
                  {format(days[0], 'd', { locale: fr })} – {format(days[6], 'd MMM yyyy', { locale: fr })}
                </span>
                <button
                  onClick={() => setCalWeekOffset(o => o + 1)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: '#1F2937', border: '1px solid #374151', borderRadius: 10, padding: '9px 12px', color: '#9CA3AF', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.82rem', fontWeight: 600, minHeight: 44 }}
                >Suivante <ChevronRight size={14} /></button>
              </div>
            </div>

            {/* ── Day list ── */}
            <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column' }}>
              {days.map((day, i) => {
                const dateStr = day.toISOString().split('T')[0]
                const isToday = dateStr === todayStr
                const daySessions = scheduledSessions
                  .filter(s => s.scheduled_at.startsWith(dateStr))
                  .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
                return (
                  <div key={i} style={{ borderBottom: i < 6 ? '1px solid #1F2937' : 'none', paddingBottom: 12, marginBottom: 4 }}>
                    {/* Day header row */}
                    <div className="cal-day-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`cal-day-label${isToday ? ' today' : ''}`}>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: isToday ? '#F97316' : '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {DAY_LABELS[i]} {format(day, 'd')}
                          </span>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.7rem', fontWeight: 600, color: isToday ? '#FB923C' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {format(day, 'MMM', { locale: fr })}
                          </span>
                        </div>
                        {daySessions.length > 0 && (
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, color: '#F97316', background: 'rgba(249,115,22,0.12)', borderRadius: 6, padding: '2px 7px' }}>
                            {daySessions.length}
                          </span>
                        )}
                      </div>
                      <button
                        className="cal-add-day"
                        onClick={() => { setNsDate(dateStr); setShowNewSession(true) }}
                      ><Plus size={11} /> Ajouter</button>
                    </div>

                    {/* Sessions or empty state */}
                    {daySessions.length === 0 ? (
                      <div className="cal-empty">Aucune séance</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {daySessions.map(s => {
                          const color = SESSION_COLORS[s.session_type] ?? '#F97316'
                          const client = clients.find(c => c.client_id === s.client_id)
                          const clientName = client?.profiles?.full_name ?? 'Client'
                          const avatarInitials = clientName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                          const dt = new Date(s.scheduled_at)
                          const dtEnd = new Date(dt.getTime() + s.duration_minutes * 60000)
                          return (
                            <div
                              key={s.id}
                              className="cal-session-card"
                              onClick={() => setSelectedSession(s)}
                              style={{ borderLeft: `4px solid ${color}` }}
                            >
                              {/* Type icon */}
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                                {TYPE_ICONS[s.session_type] ?? <Dumbbell size={15} />}
                              </div>
                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#F8FAFC', letterSpacing: '0.02em' }}>{s.session_type}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <Clock size={11} color="#6B7280" />
                                  <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{format(dt, 'HH:mm')} – {format(dtEnd, 'HH:mm')}</span>
                                </div>
                              </div>
                              {/* Client + duration */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ fontSize: '0.72rem', color: '#9CA3AF', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientName}</span>
                                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${color}25`, border: `1px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.58rem', color, flexShrink: 0 }}>
                                    {avatarInitials}
                                  </div>
                                </div>
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.68rem', fontWeight: 700, color, background: `${color}15`, borderRadius: 6, padding: '2px 7px' }}>
                                  {s.duration_minutes}min
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, padding: '0 16px 16px', flexWrap: 'wrap' }}>
              {SESSION_TYPES.map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: SESSION_COLORS[t] }} />
                  <span style={{ fontSize: '0.7rem', color: '#6B7280', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>{t}</span>
                </div>
              ))}
            </div>

            {/* Fixed FAB — Nouvelle séance */}
            <div style={{ position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, padding: '0 16px', zIndex: 35, pointerEvents: 'none' }}>
              <button
                onClick={() => setShowNewSession(true)}
                style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#F97316', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer', boxShadow: '0 4px 24px rgba(249,115,22,0.45)', transition: 'opacity 150ms' }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.opacity = '0.92'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              >
                <Plus size={16} /> Nouvelle séance
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── MESSAGES SECTION: client list (no chat open) ── */}
      {section === 'messages' && !selectedClient && (
        <div className="section-pad" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #374151', background: '#1F2937', flexShrink: 0 }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F8FAFC', margin: 0 }}>Messages</h2>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, background: '#1F2937' }}>
            {clients.length === 0 && (
              <p style={{ padding: '24px 16px', color: '#6B7280', fontSize: '0.85rem', textAlign: 'center' }}>Aucun client.</p>
            )}
            {clients.map(c => {
              const name = c.profiles?.full_name ?? 'Sans nom'
              const ini = initials(c.profiles?.full_name)
              const unread = unreadCounts[c.client_id] || 0
              return (
                <div key={c.id} className="client-chat-row" onClick={() => openChat(c)}>
                  {c.profiles?.avatar_url
                    ? <img src={c.profiles.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <div className="avatar-circle" style={{ width: 38, height: 38, fontSize: '0.9rem' }}>{ini}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>Appuyer pour ouvrir</div>
                  </div>
                  {unread > 0 && (
                    <span style={{ minWidth: 20, height: 20, background: '#EF4444', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                  <ChevronRight size={16} color="#4B5563" style={{ flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CHAT FULL-SCREEN OVERLAY (any section, when client selected) ── */}
      {selectedClient && (
        <div className="chat-fullscreen">

          {/* Header */}
          <div style={{ padding: '14px 16px', paddingTop: 'max(14px, env(safe-area-inset-top, 14px))', background: '#1F2937', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => setSelectedClient(null)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '6px', minWidth: 44, minHeight: 44 }}
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </button>
            {selectedClient.profiles?.avatar_url
              ? <img src={selectedClient.profiles.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              : <div className="avatar-circle" style={{ flexShrink: 0 }}>{initials(selectedClient.profiles?.full_name)}</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedClient.profiles?.full_name ?? 'Sans nom'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>Client</div>
            </div>
          </div>

          {/* Messages scroll area — paddingBottom leaves room for fixed input */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>Aucun message. Commencez la conversation !</p>
              </div>
            )}
            {chatMessages.map(msg => {
              const isMine = msg.sender_id === session.user.id
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%',
                    wordBreak: 'break-word',
                    background: isMine ? '#F97316' : '#1F2937',
                    color: '#F8FAFC',
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '10px 14px',
                    border: isMine ? 'none' : '1px solid #374151',
                  }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.45 }}>{msg.content}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.62rem', opacity: 0.6, textAlign: isMine ? 'right' : 'left' }}>
                      {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={msgEndRef} />
          </div>

          {/* Fixed input bar — sits above bottom nav */}
          <div style={{ position: 'fixed', bottom: 60, left: 0, right: 0, background: '#1F2937', borderTop: '1px solid #374151', padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))', display: 'flex', gap: 12, alignItems: 'center', zIndex: 201 }}>
            <input
              className="msg-input"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={`Message à ${selectedClient.profiles?.full_name?.split(' ')[0] ?? 'client'}…`}
            />
            <button
              onClick={sendMessage}
              style={{ width: 44, height: 44, borderRadius: '50%', background: msgInput.trim() ? '#F97316' : '#374151', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 200ms' }}
            >
              <Send size={17} color={msgInput.trim() ? '#000' : '#6B7280'} />
            </button>
          </div>
        </div>
      )}

      {/* ── DASHBOARD SECTION ── */}
      {section === 'dashboard' && (
        <div className="section-pad" style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>

          {/* Page header */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.02em', margin: 0 }}>Tableau de bord</h1>
            <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#9CA3AF', marginTop: '4px' }}>
              Bonjour, {coachName} — voici votre activité du jour.
            </p>
          </div>

          {/* ── STATS ROW ── */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>

            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Clients actifs</span>
                <div style={{ width: '36px', height: '36px', background: 'rgba(249,115,22,0.12)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} color="#F97316" strokeWidth={2} />
                </div>
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.75rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1 }}>
                {loading ? '—' : clients.length}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                <TrendingUp size={13} color="#22C55E" strokeWidth={2.5} />
                <span style={{ fontSize: '0.78rem', color: '#22C55E', fontWeight: 500 }}>{activeCount} actifs ce mois</span>
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Séances / semaine</span>
                <div style={{ width: '36px', height: '36px', background: 'rgba(249,115,22,0.12)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarCheck size={18} color="#F97316" strokeWidth={2} />
                </div>
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.75rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1 }}>—</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                <Minus size={13} color="#9CA3AF" strokeWidth={2.5} />
                <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 500 }}>À connecter</span>
              </div>
            </div>

            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Revenus du mois</span>
                <div style={{ width: '36px', height: '36px', background: 'rgba(34,197,94,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Euro size={18} color="#22C55E" strokeWidth={2} />
                </div>
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.75rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1 }}>—</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                <Minus size={13} color="#9CA3AF" strokeWidth={2.5} />
                <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 500 }}>À connecter</span>
              </div>
            </div>

            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setSection('messages')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Messages non lus</span>
                <div style={{ width: '36px', height: '36px', background: totalUnread > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={18} color={totalUnread > 0 ? '#EF4444' : '#F97316'} strokeWidth={2} />
                </div>
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.75rem', fontWeight: 700, color: totalUnread > 0 ? '#EF4444' : '#F8FAFC', lineHeight: 1 }}>
                {totalUnread}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 500 }}>Cliquer pour voir les messages</span>
              </div>
            </div>

          </div>

          {/* ── CONTENT GRID ── */}
          <div className="lg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>

            {/* Client table */}
            <div className="sidebar-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 className="section-title">Clients</h2>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#6B7280" strokeWidth={2} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="search" className="search-input" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Rechercher un client" />
                </div>
              </div>

              <div className="client-table-wrap" style={{ overflowX: 'auto', borderRadius: '8px', background: '#111827' }}>
                <table className="data-table" aria-label="Liste des clients">
                  <thead>
                    <tr>
                      <th scope="col">Client</th>
                      <th scope="col">Membre depuis</th>
                      <th scope="col">Poids</th>
                      <th scope="col">Statut</th>
                      <th scope="col">Messages</th>
                      <th scope="col"><span style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}>Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}><td colSpan={6}><div style={{ height: '20px', background: '#374151', borderRadius: '4px', opacity: 0.5 }} /></td></tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6B7280', padding: '40px 16px' }}>
                        {search ? 'Aucun client trouvé.' : "Aucun client pour l'instant."}
                      </td></tr>
                    ) : (
                      filtered.map(c => {
                        const p = c.profiles
                        const name = p?.full_name ?? 'Sans nom'
                        const ini = initials(p?.full_name)
                        const status = statusFor(c.created_at)
                        const meta = STATUS_META[status]
                        const since = new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                        const unread = unreadCounts[c.client_id] || 0
                        return (
                          <tr key={c.id} tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter') window.location.href = `/client/${c.client_id}` }}
                            aria-label={`Voir le profil de ${name}`}>
                            <td onClick={() => window.location.href = `/client/${c.client_id}`}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {p?.avatar_url
                                  ? <img src={p.avatar_url} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                  : <div className="avatar-circle">{ini}</div>
                                }
                                <span style={{ fontWeight: 500 }}>{name}</span>
                              </div>
                            </td>
                            <td style={{ color: '#9CA3AF' }} onClick={() => window.location.href = `/client/${c.client_id}`}>{since}</td>
                            <td onClick={() => window.location.href = `/client/${c.client_id}`}>{p?.current_weight ? `${p.current_weight} kg` : '—'}</td>
                            <td onClick={() => window.location.href = `/client/${c.client_id}`}><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                            <td>
                              <button
                                onClick={() => { setSection('messages'); openChat(c) }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: unread > 0 ? '#EF4444' : '#6B7280', padding: '4px 8px', borderRadius: 6 }}
                              >
                                <MessageCircle size={15} />
                                {unread > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{unread}</span>}
                              </button>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="btn-ghost" style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                                onClick={e => { e.stopPropagation(); window.location.href = `/client/${c.client_id}` }}
                                aria-label={`Ouvrir le profil de ${name}`}>
                                <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── MOBILE CLIENT CARDS ── */}
              <div className="client-cards-m">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 14, height: 74, opacity: 0.5 }} />
                  ))
                ) : filtered.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#6B7280', padding: '32px 0', fontSize: '0.875rem' }}>
                    {search ? 'Aucun client trouvé.' : "Aucun client pour l'instant."}
                  </p>
                ) : (
                  filtered.map((c, i) => {
                    const p = c.profiles
                    const name = p?.full_name ?? 'Sans nom'
                    const ini = initials(p?.full_name)
                    const status = statusFor(c.created_at)
                    const meta = STATUS_META[status]
                    const since = new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                    const unread = unreadCounts[c.client_id] || 0
                    return (
                      <motion.div
                        key={c.id}
                        className="client-card-m"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.055, duration: 0.28, ease: 'easeOut' }}
                        onClick={() => window.location.href = `/client/${c.client_id}`}
                      >
                        <div className="client-card-m-inner">
                          {p?.avatar_url
                            ? <img src={p.avatar_url} alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            : <div className="avatar-circle-lg">{ini}</div>
                          }
                          <div className="client-card-info">
                            <div className="client-card-name">{name}</div>
                            <div style={{ marginTop: 4 }}><span className={`badge ${meta.cls}`}>{meta.label}</span></div>
                            <div className="client-card-sub">
                              {p?.current_weight ? `${p.current_weight} kg · ` : ''}Membre depuis {since}
                            </div>
                          </div>
                          <div className="client-card-actions">
                            <button
                              className="client-card-msg-btn"
                              onClick={e => { e.stopPropagation(); setSection('messages'); openChat(c) }}
                              aria-label="Messages"
                            >
                              <MessageCircle size={20} color={unread > 0 ? '#EF4444' : '#6B7280'} />
                              {unread > 0 && <span className="msg-badge">{unread > 9 ? '9+' : unread}</span>}
                            </button>
                            <ChevronRight size={18} color="#4B5563" />
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>

              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                  {loading ? '…' : `Affichage de ${filtered.length} client${filtered.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Quick actions */}
              <div className="sidebar-card">
                <h2 className="section-title">Actions rapides</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                  <button className="btn-primary" onClick={() => setShowInvite(v => !v)} aria-label="Inviter un nouveau client">
                    <UserPlus size={16} strokeWidth={2.5} />
                    Nouveau client
                  </button>

                  {showInvite && (
                    <div className="invite-panel">
                      <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '10px', lineHeight: 1.5 }}>
                        Partage ce lien — le client sera lié à ton profil automatiquement.
                      </p>
                      <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '6px', padding: '8px 10px', fontSize: '0.72rem', color: '#9CA3AF', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: '10px' }}>
                        {inviteLink || 'Chargement…'}
                      </div>
                      <button className="btn-primary btn-primary-orange" onClick={copyInviteLink} style={{ fontSize: '0.85rem', padding: '8px 16px' }}>
                        {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier le lien</>}
                      </button>
                    </div>
                  )}

                  <button className="btn-primary btn-primary-orange" onClick={() => setShowNewSession(true)}>
                    <Dumbbell size={16} strokeWidth={2.5} />
                    Nouvelle séance
                  </button>

                  <hr className="divider" />

                  <button className="btn-secondary" onClick={() => setSection('calendar')}>
                    <Calendar size={16} strokeWidth={2} />
                    Voir le calendrier
                  </button>

                </div>
              </div>

              {/* Today */}
              <div className="sidebar-card">
                <h2 className="section-title">Aujourd'hui</h2>
                {(() => {
                  const _todayStr = new Date().toISOString().split('T')[0]
                  const todaySessions = scheduledSessions.filter(s => s.scheduled_at.startsWith(_todayStr))
                  if (todaySessions.length === 0) {
                    return <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>Aucune séance planifiée.</p>
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {todaySessions.map(s => {
                        const color = SESSION_COLORS[s.session_type] ?? '#F97316'
                        const clientName = clients.find(c => c.client_id === s.client_id)?.profiles?.full_name ?? 'Client'
                        const dt = new Date(s.scheduled_at)
                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedSession(s)}
                            style={{ background: `${color}18`, borderLeft: `3px solid ${color}`, borderRadius: 6, padding: '8px 10px', cursor: 'pointer' }}
                          >
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.75rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.session_type}</div>
                            <div style={{ fontSize: '0.82rem', color: '#F8FAFC', fontWeight: 500, marginTop: 2 }}>{clientName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={10} />{format(dt, 'HH:mm')} · {s.duration_minutes}min
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── PROFIL SECTION ── */}
      {section === 'profil' && (
        <div className="section-pad" style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 16px' }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.8rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.04em', margin: '0 0 32px' }}>Mon profil</h1>
          <div style={{ background: '#1F2937', borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="avatar-circle" style={{ width: 64, height: 64, fontSize: '1.4rem' }}>{coachInitials}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.04em' }}>{coachName}</div>
            <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>{session.user.email}</div>
            <span className="badge badge-active" style={{ marginTop: 4 }}>Coach</span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn-secondary" onClick={() => setSection('dashboard')}>
              <Users size={16} /> Tableau de bord
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '11px 20px', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer', width: '100%' }}
            >
              <LogOut size={16} /> Se déconnecter
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV (mobile only) ── */}
      <nav className="bottom-nav" aria-label="Navigation principale">
        {([
          { key: 'dashboard', icon: <Users size={22} strokeWidth={2} />, label: 'Clients' },
          { key: 'messages',  icon: <MessageCircle size={22} strokeWidth={2} />, label: 'Messages', badge: totalUnread },
          { key: 'calendar',  icon: <Calendar size={22} strokeWidth={2} />, label: 'Calendrier' },
          { key: 'profil',    icon: <div className="avatar-circle" style={{ width: 26, height: 26, fontSize: '0.65rem', flexShrink: 0 }}>{coachInitials}</div>, label: 'Profil' },
        ] as { key: string; icon: React.ReactNode; label: string; badge?: number }[]).map(tab => (
          <button
            key={tab.key}
            className={`bottom-nav-btn${section === tab.key ? ' active' : ''}`}
            onClick={() => setSection(tab.key as 'dashboard' | 'messages' | 'calendar' | 'profil')}
            aria-label={tab.label}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {tab.icon}
              {tab.badge && tab.badge > 0 ? (
                <span className="nav-badge">{tab.badge > 9 ? '9+' : tab.badge}</span>
              ) : null}
            </div>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
