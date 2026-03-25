'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Users, Shield, LogOut, RefreshCw, Check, ChevronDown, Home, Crown, Dumbbell, Utensils, UserPlus, ExternalLink } from 'lucide-react'
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

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
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
    if (error) {
      console.error('fetchProfiles error:', error)
      setFetchError(error.message)
    }
    setProfiles((data ?? []) as Profile[])
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
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.08em', color: '#F8FAFC' }}>FITPRO</span>
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

        {/* Navigation rapide */}
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '16px' }}>Navigation rapide</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {[
              { href: '/',          label: 'Dashboard Client', sub: 'Vue client',       icon: <Home size={22} color="#9CA3AF" strokeWidth={1.75} />,    accent: 'rgba(156,163,175,0.1)' },
              { href: '/coach',     label: 'Coach Panel',      sub: 'Gestion clients',  icon: <Crown size={22} color="#F97316" strokeWidth={1.75} />,   accent: 'rgba(249,115,22,0.1)'  },
              { href: '/',          label: 'Exercices',        sub: 'Base d\'exercices', icon: <Dumbbell size={22} color="#60A5FA" strokeWidth={1.75} />, accent: 'rgba(96,165,250,0.1)'  },
              { href: '/',          label: 'Nutrition',        sub: 'Suivi calories',   icon: <Utensils size={22} color="#34D399" strokeWidth={1.75} />, accent: 'rgba(52,211,153,0.1)'  },
              { href: `/join?coach=${session?.user?.id ?? ''}`, label: 'Invitation', sub: 'Lien client', icon: <UserPlus size={22} color="#A78BFA" strokeWidth={1.75} />, accent: 'rgba(167,139,250,0.1)' },
            ].map(item => (
              <a key={item.href} href={item.href} className="nav-card">
                <div style={{ width: '40px', height: '40px', background: item.accent, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '0.02em' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>{item.sub}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
