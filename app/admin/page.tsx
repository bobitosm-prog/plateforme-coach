'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Users, Shield, LogOut, RefreshCw, Check, ChevronDown, Home, Crown, Dumbbell, Utensils, UserPlus, ExternalLink, AlertTriangle, Bug, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { getRole } from '../../lib/getRole'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Role = 'client' | 'coach' | 'super_admin'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: Role | null
  current_weight: number | null
  created_at: string
}


const ROLE_META: Record<Role, { label: string; color: string; bg: string }> = {
  super_admin: { label: 'Super Admin', color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
  coach:       { label: 'Coach',       color: '#22C55E', bg: 'rgba(34,197,94,0.15)'  },
  client:      { label: 'Client',      color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)'},
}

function RolePill({ role }: { role: Role | null }) {
  const r = role ?? 'client'
  const m = ROLE_META[r]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '999px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', background: m.bg, color: m.color }}>
      {m.label}
    </span>
  )
}

function RoleSelect({ profileId, current, onChanged }: { profileId: string; current: Role | null; onChanged: () => void }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function assign(role: Role) {
    setSaving(true)
    await supabase.from('profiles').update({ role }).eq('id', profileId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); onChanged() }, 1200)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <select
        defaultValue={current ?? 'client'}
        onChange={e => assign(e.target.value as Role)}
        disabled={saving}
        style={{ background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#F8FAFC', fontFamily: "'Barlow', sans-serif", fontSize: '0.8rem', padding: '5px 28px 5px 10px', cursor: 'pointer', appearance: 'none', outline: 'none' }}
      >
        <option value="client">Client</option>
        <option value="coach">Coach</option>
        <option value="super_admin">Super Admin</option>
      </select>
      <ChevronDown size={12} color="#9CA3AF" style={{ position: 'absolute', right: '8px', pointerEvents: 'none' }} />
      {saved && <Check size={14} color="#22C55E" />}
      {saving && <RefreshCw size={14} color="#9CA3AF" style={{ animation: 'spin 1s linear infinite' }} />}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [mounted, setMounted]     = useState(false)
  const [session, setSession]     = useState<any>(null)
  const [profiles, setProfiles]   = useState<Profile[]>([])
  const [loading, setLoading]     = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [tab, setTab]             = useState<'all' | 'coaches' | 'clients'>('all')
  const [navOpen, setNavOpen]     = useState(false)
  const [section, setSection]     = useState<'users' | 'logs' | 'reports'>('users')

  // Logs
  const [logs, setLogs]           = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warning' | 'critical'>('all')
  const [logPage, setLogPage]     = useState(0)
  const [selectedLog, setSelectedLog] = useState<any>(null)

  // Reports
  const [reports, setReports]     = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportFilter, setReportFilter] = useState<'all' | 'bug' | 'amelioration' | 'autre'>('all')
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'nouveau' | 'en_cours' | 'resolu' | 'rejete'>('all')
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editPriority, setEditPriority] = useState('')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') { setSession(null); return }
      if (s) setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setLoading(false); return }
    // Role guard — only super_admin may access this page
    getRole(session.user.id, session.access_token).then(role => {
      if (role !== 'super_admin') {
        router.replace('/')
      } else {
        fetchProfiles()
      }
    })
  }, [session])

  async function fetchProfiles() {
    setLoading(true)
    setFetchError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, current_weight, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      console.error('fetchProfiles error:', error)
      setFetchError(error.message)
    }
    setProfiles((data ?? []) as Profile[])
    setLoading(false)
  }

  async function fetchLogs() {
    setLogsLoading(true)
    let q = supabase.from('app_logs').select('*').order('created_at', { ascending: false }).range(logPage * 20, (logPage + 1) * 20 - 1)
    if (logFilter !== 'all') q = q.eq('level', logFilter)
    const { data } = await q
    setLogs(data || [])
    setLogsLoading(false)
  }

  async function fetchReports() {
    setReportsLoading(true)
    let q = supabase.from('bug_reports').select('*').order('created_at', { ascending: false }).limit(50)
    if (reportFilter !== 'all') q = q.eq('type', reportFilter)
    if (reportStatusFilter !== 'all') q = q.eq('status', reportStatusFilter)
    const { data } = await q
    setReports(data || [])
    setReportsLoading(false)
  }

  async function updateReport(id: string) {
    await supabase.from('bug_reports').update({ status: editStatus, priority: editPriority, admin_notes: editNotes, updated_at: new Date().toISOString() }).eq('id', id)
    setSelectedReport(null); fetchReports()
  }

  async function purgeLogs() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('app_logs').delete().lt('created_at', cutoff)
    fetchLogs()
  }

  useEffect(() => { if (section === 'logs' && session) fetchLogs() }, [section, logFilter, logPage])
  useEffect(() => { if (section === 'reports' && session) fetchReports() }, [section, reportFilter, reportStatusFilter])
  // Auto-refresh logs
  useEffect(() => {
    if (section !== 'logs') return
    const id = setInterval(fetchLogs, 30000)
    return () => clearInterval(id)
  }, [section, logFilter, logPage])

  if (!mounted) return null

  const filtered = tab === 'all' ? profiles
    : tab === 'coaches' ? profiles.filter(p => p.role === 'coach' || p.role === 'super_admin')
    : profiles.filter(p => !p.role || p.role === 'client')

  const coachCount  = profiles.filter(p => p.role === 'coach' || p.role === 'super_admin').length
  const clientCount = profiles.filter(p => !p.role || p.role === 'client').length

  return (
    <div style={{ minHeight: '100vh', background: '#111827', color: '#F8FAFC', fontFamily: 'Barlow, sans-serif' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .nav-dropdown { position: absolute; top: calc(100% + 8px); left: 0; background: #1F2937; border: 1px solid #374151; border-radius: 10px; padding: 6px; min-width: 220px; box-shadow: 0 16px 32px rgba(0,0,0,0.4); z-index: 100; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 7px; text-decoration: none; color: #D1D5DB; font-family: Barlow, sans-serif; font-size: 0.875rem; font-weight: 500; transition: background 150ms, color 150ms; cursor: pointer; border: none; background: transparent; width: 100%; }
        .nav-item:hover { background: #374151; color: #F8FAFC; }
        .nav-card { background: #1F2937; border: 1px solid #374151; border-radius: 12px; padding: 20px; text-decoration: none; color: #F8FAFC; display: flex; flex-direction: column; gap: 10px; transition: background 150ms, border-color 150ms, transform 150ms; cursor: pointer; }
        .nav-card:hover { background: #374151; border-color: #4B5563; transform: translateY(-2px); }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table thead th { font-family: 'Barlow Condensed', sans-serif; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #9CA3AF; padding: 10px 16px; text-align: left; border-bottom: 1px solid #374151; }
        .data-table tbody tr { border-bottom: 1px solid #1F2937; transition: background 150ms; }
        .data-table tbody tr:hover { background: #1F2937; }
        .data-table tbody td { padding: 13px 16px; font-size: 0.875rem; }
        .tab-btn { background: transparent; border: none; cursor: pointer; font-family: 'Barlow Condensed', sans-serif; font-size: 0.9rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; padding: 8px 16px; border-radius: 8px; transition: background 150ms, color 150ms; }
        select:focus { border-color: #F97316 !important; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ background: '#1F2937', borderBottom: '1px solid #374151', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Logo + dropdown trigger */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNavOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', borderRadius: '8px' }}>
                <div style={{ width: '32px', height: '32px', background: '#F97316', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={18} color="#fff" strokeWidth={2.5} />
                </div>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.08em', color: '#F8FAFC' }}>MOOVX</span>
                <ChevronDown size={14} color="#9CA3AF" style={{ transition: 'transform 150ms', transform: navOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>

              {navOpen && (
                <div className="nav-dropdown" onClick={() => setNavOpen(false)}>
                  {[
                    { href: '/',        label: 'Dashboard Client', icon: <Home size={15} color="#9CA3AF" /> },
                    { href: '/coach',   label: 'Coach Panel',      icon: <Crown size={15} color="#F97316" /> },
                    { href: '/', label: 'Exercices',      icon: <Dumbbell size={15} color="#9CA3AF" /> },
                    { href: '/', label: 'Nutrition',      icon: <Utensils size={15} color="#9CA3AF" /> },
                    { href: `/join?coach=${session?.user?.id ?? ''}`, label: 'Page Invitation', icon: <UserPlus size={15} color="#22C55E" /> },
                  ].map(item => (
                    <a key={item.href} href={item.href} className="nav-item">
                      {item.icon}
                      {item.label}
                      <ExternalLink size={11} color="#4B5563" style={{ marginLeft: 'auto' }} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: '1px', height: '20px', background: '#374151' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} color="#F97316" />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 600, color: '#F97316', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Super Admin</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{session?.user?.email}</span>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/landing')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '8px 12px', borderRadius: '8px' }}>
              <LogOut size={15} strokeWidth={2} /> Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, letterSpacing: '0.02em' }}>Administration</h1>
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#111827', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
          {([['users', 'Utilisateurs', Users], ['logs', 'Logs', AlertTriangle], ['reports', 'Rapports', Bug]] as const).map(([id, label, Icon]) => {
            const active = section === id
            const badge = id === 'reports' ? reports.filter(r => r.status === 'nouveau').length : 0
            return (
              <button key={id} onClick={() => setSection(id)} className="tab-btn" style={{ color: active ? '#F8FAFC' : '#6B7280', background: active ? '#374151' : 'transparent', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                <Icon size={14} /> {label}
                {badge > 0 && <span style={{ minWidth: 16, height: 16, background: '#EF4444', borderRadius: 8, fontSize: '0.55rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{badge}</span>}
              </button>
            )
          })}
        </div>

        {/* ═══ USERS SECTION ═══ */}
        {section === 'users' && (<>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Total utilisateurs', value: profiles.length, icon: <Users size={18} color="#F97316" strokeWidth={2} />, accent: 'rgba(249,115,22,0.12)' },
            { label: 'Coachs',              value: coachCount,      icon: <Shield size={18} color="#22C55E" strokeWidth={2} />, accent: 'rgba(34,197,94,0.1)'   },
            { label: 'Clients',             value: clientCount,     icon: <Users size={18} color="#9CA3AF" strokeWidth={2} />, accent: 'rgba(156,163,175,0.1)' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1F2937', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>{s.label}</span>
                <div style={{ width: '36px', height: '36px', background: s.accent, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
              </div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2.75rem', fontWeight: 700, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background: '#1F2937', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Utilisateurs</h2>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: '#111827', borderRadius: '10px', padding: '4px' }}>
              {([['all', 'Tous'], ['coaches', 'Coachs'], ['clients', 'Clients']] as const).map(([v, l]) => (
                <button key={v} className="tab-btn" onClick={() => setTab(v)}
                  style={{ color: tab === v ? '#F8FAFC' : '#6B7280', background: tab === v ? '#374151' : 'transparent' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '8px', background: '#111827' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle actuel</th>
                  <th>Membre depuis</th>
                  <th>Assigner un rôle</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={4}><div style={{ height: '18px', background: '#374151', borderRadius: '4px', opacity: 0.4 }} /></td></tr>
                  ))
                ) : fetchError ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#EF4444', padding: '40px', fontFamily: 'monospace', fontSize: '0.8rem' }}>Erreur RLS : {fetchError}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#6B7280', padding: '40px' }}>Aucun utilisateur.</td></tr>
                ) : (
                  filtered.map(p => {
                    const name = p.full_name ?? p.email ?? p.id.slice(0, 8)
                    const displayEmail = p.email ?? '—'
                    const parts = name.trim().split(' ')
                    const ini = parts.length >= 2
                      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                      : name.slice(0, 2).toUpperCase()
                    const since = new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #F97316, #FB923C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: '#fff', flexShrink: 0 }}>
                              {ini}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, color: '#F8FAFC' }}>{name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{displayEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td><RolePill role={p.role} /></td>
                        <td style={{ color: '#9CA3AF' }}>{since}</td>
                        <td><RoleSelect profileId={p.id} current={p.role} onChanged={fetchProfiles} /></td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '14px', fontSize: '0.78rem', color: '#6B7280' }}>
            {!loading && `${filtered.length} utilisateur${filtered.length !== 1 ? 's' : ''} affiché${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        </>)}

        {/* ═══ LOGS SECTION ═══ */}
        {section === 'logs' && (
          <div style={{ background: '#1F2937', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>Logs applicatifs</h2>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 4, background: '#111827', borderRadius: 10, padding: 4 }}>
                  {(['all', 'error', 'warning', 'critical'] as const).map(f => (
                    <button key={f} className="tab-btn" onClick={() => { setLogFilter(f); setLogPage(0) }} style={{ color: logFilter === f ? '#F8FAFC' : '#6B7280', background: logFilter === f ? '#374151' : 'transparent', fontSize: '0.78rem', padding: '6px 12px' }}>
                      {f === 'all' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <button onClick={purgeLogs} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#EF4444', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>Purger &gt;30j</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 8, background: '#111827' }}>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Niveau</th><th>Message</th><th>User</th><th>Page</th></tr></thead>
                <tbody>
                  {logsLoading ? <tr><td colSpan={5}><div style={{ height: 18, background: '#374151', borderRadius: 4, opacity: 0.4 }} /></td></tr>
                  : logs.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>Aucun log</td></tr>
                  : logs.map(l => {
                    const lvlColor = l.level === 'critical' ? '#DC2626' : l.level === 'error' ? '#EF4444' : l.level === 'warning' ? '#F59E0B' : '#3B82F6'
                    return (
                      <tr key={l.id} onClick={() => setSelectedLog(l)} style={{ cursor: 'pointer' }}>
                        <td style={{ color: '#9CA3AF', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                        <td><span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: `${lvlColor}20`, color: lvlColor, textTransform: 'uppercase' }}>{l.level}</span></td>
                        <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.message}</td>
                        <td style={{ color: '#9CA3AF', fontSize: '0.78rem' }}>{l.user_email || '—'}</td>
                        <td style={{ color: '#6B7280', fontSize: '0.72rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.page_url || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <button onClick={() => setLogPage(p => Math.max(0, p - 1))} disabled={logPage === 0} style={{ padding: '6px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: logPage === 0 ? '#374151' : '#9CA3AF', cursor: logPage === 0 ? 'default' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}><ChevronLeft size={14} /> Précédent</button>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Page {logPage + 1}</span>
              <button onClick={() => setLogPage(p => p + 1)} disabled={logs.length < 20} style={{ padding: '6px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: logs.length < 20 ? '#374151' : '#9CA3AF', cursor: logs.length < 20 ? 'default' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>Suivant <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* Log detail modal */}
        {selectedLog && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setSelectedLog(null)}>
            <div style={{ background: '#1F2937', borderRadius: 16, maxWidth: 600, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Détail du log</h3>
                <button onClick={() => setSelectedLog(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem' }}>
                <div><span style={{ color: '#6B7280' }}>Date :</span> {new Date(selectedLog.created_at).toLocaleString('fr-FR')}</div>
                <div><span style={{ color: '#6B7280' }}>Niveau :</span> <span style={{ color: selectedLog.level === 'error' ? '#EF4444' : selectedLog.level === 'warning' ? '#F59E0B' : '#3B82F6', fontWeight: 700 }}>{selectedLog.level}</span></div>
                <div><span style={{ color: '#6B7280' }}>Message :</span> {selectedLog.message}</div>
                <div><span style={{ color: '#6B7280' }}>User :</span> {selectedLog.user_email || '—'}</div>
                <div><span style={{ color: '#6B7280' }}>Page :</span> {selectedLog.page_url || '—'}</div>
                {selectedLog.details && (
                  <div>
                    <span style={{ color: '#6B7280' }}>Détails :</span>
                    <pre style={{ background: '#111827', borderRadius: 8, padding: 12, marginTop: 6, fontSize: '0.72rem', color: '#9CA3AF', overflow: 'auto', maxHeight: 300 }}>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ REPORTS SECTION ═══ */}
        {section === 'reports' && (
          <div style={{ background: '#1F2937', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
                Rapports ({reports.filter(r => r.status === 'nouveau').length} nouveaux)
              </h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ display: 'flex', gap: 4, background: '#111827', borderRadius: 10, padding: 4 }}>
                  {(['all', 'bug', 'amelioration', 'autre'] as const).map(f => (
                    <button key={f} className="tab-btn" onClick={() => setReportFilter(f)} style={{ color: reportFilter === f ? '#F8FAFC' : '#6B7280', background: reportFilter === f ? '#374151' : 'transparent', fontSize: '0.72rem', padding: '5px 10px' }}>
                      {f === 'all' ? 'Tous' : f === 'amelioration' ? 'Amélio.' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, background: '#111827', borderRadius: 10, padding: 4 }}>
                  {(['all', 'nouveau', 'en_cours', 'resolu'] as const).map(f => (
                    <button key={f} className="tab-btn" onClick={() => setReportStatusFilter(f)} style={{ color: reportStatusFilter === f ? '#F8FAFC' : '#6B7280', background: reportStatusFilter === f ? '#374151' : 'transparent', fontSize: '0.72rem', padding: '5px 10px' }}>
                      {f === 'all' ? 'Tous' : f === 'en_cours' ? 'En cours' : f === 'resolu' ? 'Résolu' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 8, background: '#111827' }}>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Type</th><th>Titre</th><th>Utilisateur</th><th>Statut</th><th>Priorité</th></tr></thead>
                <tbody>
                  {reportsLoading ? <tr><td colSpan={6}><div style={{ height: 18, background: '#374151', borderRadius: 4, opacity: 0.4 }} /></td></tr>
                  : reports.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6B7280', padding: 40 }}>Aucun rapport</td></tr>
                  : reports.map(r => {
                    const typeColor = r.type === 'bug' ? '#EF4444' : r.type === 'amelioration' ? '#3B82F6' : '#6B7280'
                    const statusColor = r.status === 'nouveau' ? '#F59E0B' : r.status === 'en_cours' ? '#3B82F6' : r.status === 'resolu' ? '#22C55E' : '#6B7280'
                    const prioColor = r.priority === 'critique' ? '#DC2626' : r.priority === 'haute' ? '#EF4444' : r.priority === 'normal' ? '#F59E0B' : '#6B7280'
                    return (
                      <tr key={r.id} onClick={() => { setSelectedReport(r); setEditStatus(r.status); setEditPriority(r.priority); setEditNotes(r.admin_notes || '') }} style={{ cursor: 'pointer' }}>
                        <td style={{ color: '#9CA3AF', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                        <td><span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: `${typeColor}20`, color: typeColor, textTransform: 'uppercase' }}>{r.type}</span></td>
                        <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                        <td style={{ color: '#9CA3AF', fontSize: '0.78rem' }}>{r.user_email || '—'}<br /><span style={{ fontSize: '0.65rem', color: '#4B5563' }}>{r.user_role}</span></td>
                        <td><span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: `${statusColor}20`, color: statusColor }}>{r.status}</span></td>
                        <td><span style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, background: `${prioColor}15`, color: prioColor }}>{r.priority}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report detail modal */}
        {selectedReport && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setSelectedReport(null)}>
            <div style={{ background: '#1F2937', borderRadius: 16, maxWidth: 560, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 24 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Rapport #{selectedReport.id.slice(0, 8)}</h3>
                <button onClick={() => setSelectedReport(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={16} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedReport.title}</div>
                <div style={{ color: '#9CA3AF', lineHeight: 1.6, background: '#111827', borderRadius: 10, padding: 14 }}>{selectedReport.description}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: '#6B7280', flexWrap: 'wrap' }}>
                  <span>Par : {selectedReport.user_email} ({selectedReport.user_role})</span>
                  <span>Page : {selectedReport.page_url || '—'}</span>
                  <span>{new Date(selectedReport.created_at).toLocaleString('fr-FR')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Statut</label>
                    <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#F8FAFC', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                      {['nouveau', 'en_cours', 'resolu', 'rejete'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Priorité</label>
                    <select value={editPriority} onChange={e => setEditPriority(e.target.value)} style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#F8FAFC', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                      {['basse', 'normal', 'haute', 'critique'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Notes admin</label>
                  <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 8, padding: '10px 12px', color: '#F8FAFC', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }} placeholder="Notes internes..." />
                </div>
                <button onClick={() => updateReport(selectedReport.id)} style={{ width: '100%', padding: 12, background: '#F97316', border: 'none', borderRadius: 10, color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>Sauvegarder</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
