'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { Zap, Users, Shield, LogOut, RefreshCw, Check, ChevronDown } from 'lucide-react'

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
    // Clear the role cookie so middleware re-fetches on next request
    document.cookie = 'fitpro-role=; Max-Age=0; path=/'
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
  const [mounted, setMounted]     = useState(false)
  const [session, setSession]     = useState<any>(null)
  const [profiles, setProfiles]   = useState<Profile[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'all' | 'coaches' | 'clients'>('all')

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { if (session) fetchProfiles() }, [session])

  async function fetchProfiles() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, current_weight, created_at')
      .order('created_at', { ascending: false })
    if (data) setProfiles(data as Profile[])
    setLoading(false)
  }

  if (!mounted) return null

  const filtered = tab === 'all' ? profiles
    : tab === 'coaches' ? profiles.filter(p => p.role === 'coach' || p.role === 'super_admin')
    : profiles.filter(p => !p.role || p.role === 'client')

  const coachCount  = profiles.filter(p => p.role === 'coach' || p.role === 'super_admin').length
  const clientCount = profiles.filter(p => !p.role || p.role === 'client').length

  return (
    <div style={{ minHeight: '100vh', background: '#111827', color: '#F8FAFC', fontFamily: 'Barlow, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
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
            <div style={{ width: '32px', height: '32px', background: '#F97316', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.08em' }}>FITPRO</span>
            <div style={{ width: '1px', height: '20px', background: '#374151' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} color="#F97316" />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.85rem', fontWeight: 600, color: '#F97316', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Super Admin</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{session?.user?.email}</span>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontFamily: 'Barlow, sans-serif', fontSize: '0.875rem', padding: '8px 12px', borderRadius: '8px' }}>
              <LogOut size={15} strokeWidth={2} /> Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, letterSpacing: '0.02em' }}>Administration</h1>
          <p style={{ color: '#9CA3AF', fontSize: '0.9rem', marginTop: '4px' }}>Gestion des utilisateurs et des rôles</p>
        </div>

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
      </div>
    </div>
  )
}
