'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Zap, Moon, Dumbbell } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
const DAY_LABELS: Record<string,string> = { lundi:'Lun', mardi:'Mar', mercredi:'Mer', jeudi:'Jeu', vendredi:'Ven', samedi:'Sam', dimanche:'Dim' }
const DAY_FULL: Record<string,string> = { lundi:'Lundi', mardi:'Mardi', mercredi:'Mercredi', jeudi:'Jeudi', vendredi:'Vendredi', samedi:'Samedi', dimanche:'Dimanche' }

type Exercise = { name: string; sets: number; reps: number; rest: string; notes: string }
type DayData  = { repos: boolean; exercises: Exercise[] }
type Program  = Record<string, DayData>

export default function ProgrammePage() {
  const router = useRouter()
  const [program, setProgram] = useState<Program | null>(null)
  const [activeDay, setActiveDay] = useState('lundi')
  const [loading, setLoading]   = useState(true)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      const { data } = await supabase
        .from('client_programs')
        .select('program')
        .eq('client_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setProgram(data?.program ?? null)
      setLoading(false)
    })
  }, [mounted, router])

  if (!mounted || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #374151', borderTopColor: '#F97316', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const dayData: DayData | null = program ? (program[activeDay] ?? { repos: false, exercises: [] }) : null

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        body{margin:0;font-family:'Barlow',sans-serif;background:#111827;color:#F8FAFC;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .card{background:#1F2937;border:1px solid #374151;border-radius:14px;}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:#9CA3AF;border:none;padding:7px 12px;border-radius:8px;font-family:'Barlow',sans-serif;font-size:.875rem;font-weight:500;cursor:pointer;transition:background 150ms,color 150ms;}
        .btn-ghost:hover{background:#374151;color:#F8FAFC;}
        .section-title{font-family:'Barlow Condensed',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;}
      `}</style>

      {/* NAVBAR */}
      <nav style={{ background: '#1F2937', borderBottom: '1px solid #374151', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <button className="btn-ghost" style={{ padding: '7px 10px' }} onClick={() => router.push('/')}>
            <ArrowLeft size={16} strokeWidth={2.5} /> Retour
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, background: '#F97316', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={13} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '0.08em' }}>PROGRAMME</span>
          </div>
          <div style={{ width: 80 }} />
        </div>
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 40px' }}>

        {/* No program */}
        {!program ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(249,115,22,.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Dumbbell size={28} color="#F97316" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>Pas encore de programme</h2>
            <p style={{ fontSize: '0.9rem', color: '#6B7280', margin: 0, maxWidth: 300 }}>Ton coach n&apos;a pas encore créé ton programme d&apos;entraînement.</p>
          </div>
        ) : (
          <>
            {/* Day tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
              {DAYS.map(day => {
                const d: DayData = program[day] ?? { repos: false, exercises: [] }
                const isActive = activeDay === day
                const hasEx = !d.repos && d.exercises?.length > 0
                return (
                  <button key={day} onClick={() => setActiveDay(day)} style={{
                    flexShrink: 0, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.04em',
                    transition: 'all 150ms',
                    background: d.repos ? 'rgba(107,114,128,.12)' : isActive ? '#F97316' : hasEx ? 'rgba(249,115,22,.12)' : '#1F2937',
                    color: d.repos ? '#6B7280' : isActive ? '#fff' : hasEx ? '#F97316' : '#4B5563',
                    boxShadow: isActive ? '0 0 0 2px #F97316' : 'none',
                  }}>
                    {DAY_LABELS[day]}
                    {d.repos && <Moon size={9} style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                    {hasEx && !isActive && (
                      <span style={{ marginLeft: 5, fontSize: '0.65rem', background: 'rgba(249,115,22,.2)', borderRadius: 999, padding: '0 4px' }}>{d.exercises.length}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Day content */}
            {dayData && (
              <div style={{ animation: 'fadeUp 200ms ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>{DAY_FULL[activeDay]}</h2>
                  {dayData.repos && (
                    <span style={{ fontSize: '0.72rem', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'rgba(107,114,128,.15)', color: '#6B7280', borderRadius: 999, padding: '2px 10px' }}>Repos</span>
                  )}
                </div>

                {dayData.repos ? (
                  <div className="card" style={{ padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                    <Moon size={36} color="#4B5563" strokeWidth={1.5} />
                    <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#6B7280', margin: 0 }}>Jour de repos</p>
                    <p style={{ fontSize: '0.85rem', color: '#4B5563', margin: 0 }}>Profites-en pour récupérer et te reposer.</p>
                  </div>
                ) : dayData.exercises?.length === 0 ? (
                  <div className="card" style={{ padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                    <Dumbbell size={32} color="#374151" strokeWidth={1.5} />
                    <p style={{ fontSize: '0.9rem', color: '#6B7280', margin: 0 }}>Aucun exercice prévu ce jour.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dayData.exercises.map((ex, i) => (
                      <div key={i} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, animation: `fadeUp ${150 + i * 40}ms ease` }}>
                        {/* Index badge */}
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(249,115,22,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#F97316' }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: 8 }}>
                            {ex.name || 'Exercice sans nom'}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <Chip label="Séries" value={String(ex.sets)} color="#F97316" />
                            <Chip label="Reps" value={String(ex.reps)} color="#F97316" />
                            {ex.rest && <Chip label="Repos" value={ex.rest} color="#6B7280" />}
                          </div>
                          {ex.notes && (
                            <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '8px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>{ex.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#111827', border: '1px solid #374151', borderRadius: 8, padding: '4px 10px' }}>
      <span style={{ fontSize: '0.68rem', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7280' }}>{label}</span>
      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: '0.95rem', color }}>{value}</span>
    </div>
  )
}
