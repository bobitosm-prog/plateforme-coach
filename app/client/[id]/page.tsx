'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Zap, Mail, Calendar, Scale, Target, Dumbbell,
  Flame, TrendingDown, CheckCircle, CalendarClock, Save,
  Archive, Trash2, Check, X,
} from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  current_weight: number | null
  goal_weight: number | null
  goal: string | null
  created_at: string
}

type WorkoutSession = {
  id: string
  date: string
  session_type: string | null
  duration_min: number | null
  notes: string | null
}

type WeightLog = {
  id: string
  weight: number
  recorded_at: string
}

const inputStyle = {
  width: '100%',
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: '8px',
  padding: '11px 14px',
  fontFamily: 'Barlow, sans-serif',
  fontSize: '0.9rem',
  color: '#F8FAFC',
  outline: 'none',
  transition: 'border-color 200ms ease, box-shadow 200ms ease',
}

function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      setCoachId(session.user.id)
    })
  }, [router])

  const fetchData = useCallback(async () => {
    if (!coachId) return
    setLoading(true)
    setError(null)

    const [profileRes, sessionsRes, weightRes, notesRes] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,current_weight,goal_weight,goal,created_at').eq('id', id).single(),
      supabase.from('workout_sessions').select('id,date,session_type,duration_min,notes').eq('user_id', id).order('date', { ascending: false }).limit(20),
      supabase.from('weight_logs').select('id,weight,recorded_at').eq('user_id', id).order('recorded_at', { ascending: false }).limit(30),
      supabase.from('coach_notes').select('content').eq('coach_id', coachId).eq('client_id', id).maybeSingle(),
    ])

    if (profileRes.error) { setError(profileRes.error.message); setLoading(false); return }
    setProfile(profileRes.data as Profile)
    setEditName(profileRes.data?.full_name ?? '')
    setEditEmail(profileRes.data?.email ?? '')
    setSessions((sessionsRes.data ?? []) as WorkoutSession[])
    setWeightLogs((weightRes.data ?? []) as WeightLog[])
    setNotes(notesRes.data?.content ?? '')
    setLoading(false)
  }, [coachId, id])

  useEffect(() => { fetchData() }, [fetchData])

  const saveNotes = async () => {
    if (!coachId) return
    setNotesSaving(true)
    await supabase.from('coach_notes').upsert(
      { coach_id: coachId, client_id: id, content: notes, updated_at: new Date().toISOString() },
      { onConflict: 'coach_id,client_id' }
    )
    setNotesSaving(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const onNotesChange = (val: string) => {
    setNotes(val)
    setNotesSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNotes(), 3000)
  }

  const saveEdit = async () => {
    await supabase.from('profiles').update({ full_name: editName, email: editEmail }).eq('id', id)
    setProfile(p => p ? { ...p, full_name: editName, email: editEmail } : p)
    setEditOpen(false)
    showToast('Profil mis à jour')
  }

  // Derived metrics
  const currentWeight = weightLogs[0]?.weight ?? profile?.current_weight ?? null
  const prevMonthWeight = weightLogs.find(w => {
    const d = new Date(w.recorded_at)
    const now = new Date()
    return d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()
  })?.weight ?? null
  const weightDelta = currentWeight && prevMonthWeight ? currentWeight - prevMonthWeight : null
  const totalSessions = sessions.length
  const goalProgress = (() => {
    if (!currentWeight || !profile?.goal_weight || !profile?.current_weight) return null
    const start = profile.current_weight
    const target = profile.goal_weight
    if (start === target) return 100
    const progress = Math.round(((start - currentWeight) / (start - target)) * 100)
    return Math.max(0, Math.min(100, progress))
  })()

  // Streak: count consecutive days with sessions from today backwards
  const streak = (() => {
    if (!sessions.length) return 0
    const dates = [...new Set(sessions.map(s => s.date))].sort((a, b) => b.localeCompare(a))
    let count = 0
    let cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    for (const d of dates) {
      const sd = new Date(d)
      sd.setHours(0, 0, 0, 0)
      const diff = Math.round((cursor.getTime() - sd.getTime()) / 86400000)
      if (diff <= 1) { count++; cursor = sd }
      else break
    }
    return count
  })()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #374151', borderTopColor: '#F97316', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: '#EF4444', fontSize: '0.9rem' }}>{error ?? 'Client introuvable'}</p>
        <button onClick={() => router.back()} style={{ color: '#F97316', background: 'none', border: '1px solid #F97316', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 600 }}>
          ← Retour
        </button>
      </div>
    )
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Barlow:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        body{margin:0;font-family:'Barlow',sans-serif;background:#111827;color:#F8FAFC;}
        h1,h2,h3,h4{font-family:'Barlow Condensed',sans-serif;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .metric-card{background:#1F2937;border:1px solid #374151;border-radius:12px;padding:16px;transition:box-shadow 200ms ease;}
        .metric-card:hover{box-shadow:0 10px 15px rgba(0,0,0,0.15);}
        .card{background:#1F2937;border:1px solid #374151;border-radius:12px;padding:20px;}
        .section-title{font-family:'Barlow Condensed',sans-serif;font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6B7280;margin-bottom:16px;}
        .btn-primary{display:inline-flex;align-items:center;gap:8px;background:#22C55E;color:#fff;padding:10px 20px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:0.95rem;font-weight:600;letter-spacing:0.04em;border:none;cursor:pointer;transition:opacity 200ms ease,transform 200ms ease;}
        .btn-primary:hover{opacity:0.9;transform:translateY(-1px);}
        .btn-secondary{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#F97316;border:2px solid #F97316;padding:8px 18px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:0.95rem;font-weight:600;letter-spacing:0.04em;cursor:pointer;transition:background 200ms ease,color 200ms ease;}
        .btn-secondary:hover{background:#F97316;color:#fff;}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#9CA3AF;border:none;padding:7px 12px;border-radius:8px;font-family:'Barlow',sans-serif;font-size:0.875rem;font-weight:500;cursor:pointer;transition:background 150ms ease,color 150ms ease;}
        .btn-ghost:hover{background:#374151;color:#F8FAFC;}
        .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-family:'Barlow Condensed',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;}
        .badge-active{background:rgba(34,197,94,0.15);color:#22C55E;}
        .data-table{width:100%;border-collapse:collapse;}
        .data-table thead th{font-family:'Barlow Condensed',sans-serif;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:#6B7280;padding:10px 16px;text-align:left;border-bottom:1px solid #374151;}
        .data-table tbody tr{border-bottom:1px solid #1F2937;transition:background 150ms ease;}
        .data-table tbody tr:last-child{border-bottom:none;}
        .data-table tbody tr:hover{background:#374151;}
        .data-table tbody td{padding:13px 16px;font-size:0.875rem;color:#F8FAFC;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;pointer-events:none;transition:opacity 200ms ease;}
        .modal-overlay.open{opacity:1;pointer-events:all;}
        .modal{background:#1F2937;border-radius:16px;padding:32px;max-width:480px;width:92%;transform:translateY(12px);transition:transform 200ms ease;}
        .modal-overlay.open .modal{transform:translateY(0);}
        .toast-el{position:fixed;bottom:24px;right:24px;background:#1F2937;border:1px solid #374151;border-left:3px solid #22C55E;color:#F8FAFC;padding:12px 18px;border-radius:8px;font-size:0.875rem;font-weight:500;display:flex;align-items:center;gap:8px;z-index:200;animation:fadeIn 200ms ease;box-shadow:0 10px 15px rgba(0,0,0,0.3);}
      `}</style>

      {/* NAVBAR */}
      <nav style={{ background: '#1F2937', borderBottom: '1px solid #374151', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/coach')} className="btn-ghost" style={{ padding: '7px 10px' }}>
              <ArrowLeft size={16} strokeWidth={2.5} />
              <span style={{ display: 'none' }} className="sm-inline">Dashboard</span>
            </button>
            <div style={{ width: 1, height: 20, background: '#374151' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 28, height: 28, background: '#F97316', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={15} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.08em' }}>FITPRO</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#F97316,#FB923C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>
              {initials(profile.full_name)}
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{ maxWidth: 1152, margin: '0 auto', padding: '32px 24px' }}>

        {/* CLIENT HEADER */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.6rem', fontWeight: 700, color: '#fff', border: '3px solid #1F2937', boxShadow: '0 0 0 2px #F97316' }}>
                {initials(profile.full_name)}
              </div>
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, background: '#22C55E', borderRadius: '50%', border: '2px solid #1F2937' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>{profile.full_name ?? 'Client'}</h1>
                <span className="badge badge-active">Actif</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 20px', marginTop: 4 }}>
                {profile.email && (
                  <span style={{ fontSize: '0.85rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Mail size={13} strokeWidth={2} />{profile.email}
                  </span>
                )}
                <span style={{ fontSize: '0.85rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={13} strokeWidth={2} />Client depuis {formatMonthYear(profile.created_at)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button className="btn-secondary" onClick={() => setEditOpen(true)}>
                Modifier
              </button>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>

          {/* LEFT (2/3) */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* METRIC CARDS */}
            <section>
              <p className="section-title">Métriques clés</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>

                {/* Poids */}
                <div className="metric-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>Poids</span>
                    <div style={{ width: 30, height: 30, background: 'rgba(249,115,22,0.12)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Scale size={14} color="#F97316" strokeWidth={2} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '2rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1 }}>
                    {currentWeight ?? '—'}<span style={{ fontSize: '1rem', color: '#6B7280', fontWeight: 500, marginLeft: 2 }}>kg</span>
                  </div>
                  {weightDelta !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 8 }}>
                      <TrendingDown size={12} color={weightDelta <= 0 ? '#22C55E' : '#EF4444'} strokeWidth={2.5} />
                      <span style={{ fontSize: '0.72rem', color: weightDelta <= 0 ? '#22C55E' : '#EF4444', fontWeight: 500 }}>
                        {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg ce mois
                      </span>
                    </div>
                  )}
                </div>

                {/* Objectif */}
                <div className="metric-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>Objectif</span>
                    <div style={{ width: 30, height: 30, background: 'rgba(34,197,94,0.1)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Target size={14} color="#22C55E" strokeWidth={2} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2 }}>
                    {profile.goal ?? (profile.goal_weight ? `${profile.goal_weight} kg` : '—')}
                  </div>
                  {goalProgress !== null && (
                    <>
                      <div style={{ background: '#374151', borderRadius: 999, height: 6, marginTop: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 999, background: '#22C55E', width: `${goalProgress}%`, transition: 'width 600ms ease' }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 4, display: 'block' }}>{goalProgress} % atteint</span>
                    </>
                  )}
                </div>

                {/* Séances */}
                <div className="metric-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>Séances</span>
                    <div style={{ width: 30, height: 30, background: 'rgba(249,115,22,0.12)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Dumbbell size={14} color="#F97316" strokeWidth={2} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '2rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1 }}>
                    {totalSessions}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 8 }}>
                    <CheckCircle size={12} color="#22C55E" strokeWidth={2.5} />
                    <span style={{ fontSize: '0.72rem', color: '#22C55E', fontWeight: 500 }}>complétées</span>
                  </div>
                </div>

                {/* Streak */}
                <div className="metric-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>Streak</span>
                    <div style={{ width: 30, height: 30, background: 'rgba(249,115,22,0.12)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Flame size={14} color="#F97316" strokeWidth={2} />
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '2.5rem', fontWeight: 700, color: '#F97316', lineHeight: 1 }}>
                    {streak}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: '0.72rem', color: '#F97316', fontWeight: 500 }}>jours consécutifs</span>
                  </div>
                </div>
              </div>
            </section>

            {/* SESSIONS TABLE */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p className="section-title" style={{ marginBottom: 0 }}>Historique des séances</p>
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Durée</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: '#6B7280', padding: '32px 16px' }}>
                            Aucune séance enregistrée
                          </td>
                        </tr>
                      ) : sessions.map(s => (
                        <tr key={s.id}>
                          <td style={{ color: '#9CA3AF', whiteSpace: 'nowrap' }}>{formatDate(s.date)}</td>
                          <td>{s.session_type ?? '—'}</td>
                          <td>{s.duration_min ? `${s.duration_min} min` : '—'}</td>
                          <td style={{ color: '#9CA3AF', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>{sessions.length} séance{sessions.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COL (1/3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* PROCHAIN RDV */}
            <section className="card">
              <p className="section-title">Prochain RDV</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#111827', borderRadius: 10, padding: 16, borderLeft: '3px solid #F97316' }}>
                <div style={{ width: 40, height: 40, background: 'rgba(249,115,22,0.12)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CalendarClock size={18} color="#F97316" strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>À planifier</div>
                  <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginTop: 2 }}>Aucun RDV planifié</div>
                </div>
              </div>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} onClick={() => showToast('Planification de RDV à venir')}>
                Planifier un RDV
              </button>
            </section>

            {/* NOTES COACH */}
            <section className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <p className="section-title" style={{ marginBottom: 0 }}>Notes coach</p>
                <div style={{ fontSize: '0.75rem', color: '#22C55E', display: 'flex', alignItems: 'center', gap: 4, opacity: notesSaved ? 1 : 0, transition: 'opacity 300ms ease' }}>
                  <Check size={12} strokeWidth={2.5} />Sauvegardé
                </div>
              </div>
              <textarea
                value={notes}
                onChange={e => onNotesChange(e.target.value)}
                placeholder="Ajoutez vos observations, programmes, remarques sur la progression de ce client…"
                style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: 8, padding: '14px 16px', fontFamily: 'Barlow, sans-serif', fontSize: '0.9rem', color: '#F8FAFC', resize: 'vertical', minHeight: 120, lineHeight: 1.6, outline: 'none', transition: 'border-color 200ms ease' }}
                onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)' }}
                onBlur={e => { e.target.style.borderColor = '#374151'; e.target.style.boxShadow = 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={saveNotes} disabled={notesSaving}>
                  <Save size={13} strokeWidth={2.5} />
                  {notesSaving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </div>
            </section>

            {/* DANGER ZONE */}
            <section className="card" style={{ border: '1px solid #374151' }}>
              <p className="section-title" style={{ color: '#EF4444' }}>Zone avancée</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn-ghost" style={{ justifyContent: 'flex-start', color: '#9CA3AF' }} onClick={() => showToast('Archivage à implémenter')}>
                  <Archive size={14} strokeWidth={2} />Archiver le client
                </button>
                <button className="btn-ghost" style={{ justifyContent: 'flex-start', color: '#EF4444' }} onClick={() => showToast('Suppression à implémenter')}>
                  <Trash2 size={14} strokeWidth={2} />Supprimer le client
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* EDIT MODAL */}
      <div className={`modal-overlay${editOpen ? ' open' : ''}`} onClick={() => setEditOpen(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#F8FAFC' }}>Modifier le profil</h2>
            <button style={{ background: '#374151', border: 'none', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setEditOpen(false)}>
              <X size={16} color="#9CA3AF" strokeWidth={2} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#9CA3AF', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed',sans-serif" }}>Nom complet</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)' }}
                onBlur={e => { e.target.style.borderColor = '#374151'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#9CA3AF', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: "'Barlow Condensed',sans-serif" }}>Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#F97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)' }}
                onBlur={e => { e.target.style.borderColor = '#374151'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditOpen(false)}>Annuler</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveEdit}>
                <Check size={14} strokeWidth={2.5} />Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="toast-el">
          <CheckCircle size={15} color="#22C55E" strokeWidth={2} />
          <span>{toast}</span>
        </div>
      )}
    </>
  )
}
