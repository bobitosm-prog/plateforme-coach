'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import {
  Zap, Users, CalendarCheck, Euro, TrendingUp, Minus,
  Search, ChevronRight, UserPlus, Dumbbell, Calendar,
  LogOut, Copy, Check, ExternalLink
} from 'lucide-react'
import { getRole } from '../../lib/getRole'

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

    // Role guard — redirect non-coaches away before loading any data
    getRole(session.user.id, session.access_token).then(role => {
      if (role !== 'coach' && role !== 'super_admin') {
        router.replace('/')
      } else {
        fetchClients(session.user.id)
      }
    })
  }, [session])

  async function fetchClients(coachId: string) {
    setLoading(true)

    const { data: links, error: linksError } = await supabase
      .from('coach_clients')
      .select('id, client_id, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })

    if (linksError || !links?.length) {
      setClients([])
      setLoading(false)
      return
    }

    const clientIds = links.map(l => l.client_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, current_weight, calorie_goal')
      .in('id', clientIds)

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
    const rows: ClientRow[] = links.map(l => ({
      id: l.id,
      client_id: l.client_id,
      created_at: l.created_at,
      profiles: profileMap[l.client_id] ?? null,
    }))
    setClients(rows)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return clients
    return clients.filter(c =>
      (c.profiles?.full_name ?? '').toLowerCase().includes(q)
    )
  }, [clients, search])

  function copyInviteLink() {
    if (!inviteLink) return
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteLink).catch(() => fallbackCopy(inviteLink))
    } else {
      fallbackCopy(inviteLink)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function fallbackCopy(text: string) {
    const el = document.createElement('textarea')
    el.value = text
    el.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(el)
    el.focus(); el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
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
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#F97316', brandAccent: '#EA580C' } } } }}
            theme="dark"
            providers={['google']}
          />
        </div>
      </div>
    )
  }

  const coachName = session.user.user_metadata?.full_name || session.user.email || 'Coach'
  const coachInitials = initials(coachName)
  const activeCount = clients.filter(c => statusFor(c.created_at) === 'active').length

  return (
    <div style={{ minHeight: '100vh', background: '#111827', color: '#F8FAFC', fontFamily: 'Barlow, sans-serif' }}>
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
        @media (max-width: 640px) { .hide-sm { display: none !important; } }
        @media (max-width: 1024px) { .lg-grid { grid-template-columns: 1fr !important; } }
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

      {/* ── MAIN ── */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.02em', margin: 0 }}>Tableau de bord</h1>
          <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#9CA3AF', marginTop: '4px' }}>
            Bonjour, {coachName} — voici votre activité du jour.
          </p>
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>

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

        </div>

        {/* ── CONTENT GRID ── */}
        <div className="lg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>

          {/* Client table */}
          <div className="sidebar-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 className="section-title">Clients</h2>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#6B7280" strokeWidth={2} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="search"
                  className="search-input"
                  placeholder="Rechercher…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Rechercher un client"
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '8px', background: '#111827' }}>
              <table className="data-table" aria-label="Liste des clients">
                <thead>
                  <tr>
                    <th scope="col">Client</th>
                    <th scope="col">Membre depuis</th>
                    <th scope="col">Poids</th>
                    <th scope="col">Statut</th>
                    <th scope="col"><span style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}>Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5}>
                          <div style={{ height: '20px', background: '#374151', borderRadius: '4px', opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#6B7280', padding: '40px 16px' }}>
                        {search ? 'Aucun client trouvé.' : 'Aucun client pour l\'instant.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(c => {
                      const p = c.profiles
                      const name = p?.full_name ?? 'Sans nom'
                      const ini = initials(p?.full_name)
                      const status = statusFor(c.created_at)
                      const meta = STATUS_META[status]
                      const since = new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                      return (
                        <tr key={c.id} onClick={() => window.location.href = `/client/${c.client_id}`} tabIndex={0}
                          onKeyDown={e => { if (e.key === 'Enter') window.location.href = `/client/${c.client_id}` }}
                          aria-label={`Voir le profil de ${name}`}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {p?.avatar_url
                                ? <img src={p.avatar_url} alt="" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                : <div className="avatar-circle">{ini}</div>
                              }
                              <span style={{ fontWeight: 500 }}>{name}</span>
                            </div>
                          </td>
                          <td style={{ color: '#9CA3AF' }}>{since}</td>
                          <td>{p?.current_weight ? `${p.current_weight} kg` : '—'}</td>
                          <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
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

                <button className="btn-primary btn-primary-orange" aria-label="Planifier une séance">
                  <Dumbbell size={16} strokeWidth={2.5} />
                  Nouvelle séance
                </button>

                <hr className="divider" />

                <button className="btn-secondary" aria-label="Voir le calendrier">
                  <Calendar size={16} strokeWidth={2} />
                  Voir le calendrier
                </button>

              </div>
            </div>

            {/* Today */}
            <div className="sidebar-card">
              <h2 className="section-title">Aujourd'hui</h2>
              <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>Aucune séance planifiée.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
