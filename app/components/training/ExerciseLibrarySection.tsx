'use client'
import { useState } from 'react'
import { Dumbbell, Search, ChevronRight, ArrowRightLeft, X } from 'lucide-react'
import { toast } from 'sonner'
import { fonts, colors, titleStyle, titleLineStyle, bodyStyle, labelStyle, mutedStyle, cardStyle, btnPrimary } from '../../../lib/design-tokens'

interface ExerciseLibrarySectionProps {
  exercisesCache: any[]
  activeCustomProgram: any
  supabase: any
  onProgramUpdate: (updated: any) => void
  onStartWorkout: (day: any, exercises: any[]) => void
}

export default function ExerciseLibrarySection({ exercisesCache, activeCustomProgram, supabase, onProgramUpdate, onStartWorkout }: ExerciseLibrarySectionProps) {
  const [libSearch, setLibSearch] = useState('')
  const [libMuscle, setLibMuscle] = useState('Tous')
  const [libShowAll, setLibShowAll] = useState(false)
  const [libDetail, setLibDetail] = useState<any>(null)
  const [altSearch, setAltSearch] = useState('')
  const [altSelected, setAltSelected] = useState<any>(null)
  const [altResults, setAltResults] = useState<any[]>([])

  return (
    <>
      <div style={{ padding: '0 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={titleStyle}>EXERCICES</span>
          <div style={titleLineStyle} />
          <button onClick={() => setLibShowAll(true)} style={{ ...labelStyle, fontSize: 10, letterSpacing: 1, flexShrink: 0 }}>Voir tout &rarr;</button>
        </div>
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} color={colors.textDim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={libSearch} onChange={e => setLibSearch(e.target.value)} placeholder="Rechercher un exercice..." style={{ width: '100%', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 12px 10px 34px', color: colors.text, fontFamily: fonts.body, fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
            {['Tous', 'Pectoraux', 'Dos', '\u00c9paules', 'Biceps', 'Triceps', 'Jambes', 'Abdos', 'Fessiers', 'Mollets'].map(m => (
              <button key={m} onClick={() => setLibMuscle(m)} style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', cursor: 'pointer', border: 'none', background: libMuscle === m ? `${colors.goldContainer}33` : colors.goldDim, color: libMuscle === m ? colors.gold : colors.textMuted, ...(libMuscle === m ? { boxShadow: `inset 0 0 0 1px ${colors.goldContainer}66` } : { boxShadow: `inset 0 0 0 1px ${colors.goldBorder}` }) }}>{m}</button>
            ))}
          </div>
          {(() => {
            const filtered = exercisesCache.filter((e: any) => {
              if (libMuscle !== 'Tous' && e.muscle_group?.toLowerCase() !== libMuscle.toLowerCase()) return false
              if (libSearch && !e.name?.toLowerCase().includes(libSearch.toLowerCase())) return false
              return true
            })
            const shown = filtered.slice(0, 5)
            return shown.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {shown.map((ex: any) => (
                  <button key={ex.id} onClick={() => setLibDetail(ex)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderBottom: `1px solid ${colors.goldDim}` }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: colors.surfaceHigh, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {ex.gif_url ? <img src={ex.gif_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Dumbbell size={20} color={colors.textDim} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: fonts.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                        {ex.muscle_group && <span style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ex.muscle_group}</span>}
                      </div>
                      {ex.equipment && <div style={{ fontSize: 10, color: colors.textDim, fontFamily: fonts.body, marginTop: 2 }}>{ex.equipment}</div>}
                    </div>
                    <ChevronRight size={16} color={colors.textDim} style={{ flexShrink: 0 }} />
                  </button>
                ))}
                {filtered.length > 5 && (
                  <button onClick={() => setLibShowAll(true)} style={{ padding: '8px 0', background: 'transparent', border: 'none', color: colors.gold, fontFamily: fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', textAlign: 'center' }}>+{filtered.length - 5} exercices &middot; Voir tout</button>
                )}
              </div>
            ) : (
              <div style={{ ...bodyStyle, textAlign: 'center', padding: 16, fontStyle: 'italic' }}>Aucun exercice trouv&eacute;.</div>
            )
          })()}
        </div>
      </div>
      {libDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ ...titleStyle, fontSize: 16 }}>{libDetail.name}</span>
              <button aria-label="Fermer les details de l'exercice" onClick={() => setLibDetail(null)} style={{ background: colors.surfaceHigh, border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16} color={colors.text} /></button>
            </div>
            {libDetail.video_url && <video src={libDetail.video_url} controls autoPlay loop muted playsInline style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 240, objectFit: 'cover' }} />}
            {!libDetail.video_url && libDetail.gif_url && <img src={libDetail.gif_url} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 16, maxHeight: 240, objectFit: 'cover' }} />}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {libDetail.muscle_group && <span style={{ fontSize: 10, fontFamily: fonts.body, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase' }}>{libDetail.muscle_group}</span>}
              {libDetail.difficulty && <span style={{ fontSize: 10, fontFamily: fonts.body, fontWeight: 700, color: colors.textMuted, background: colors.surfaceHigh, padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase' }}>{libDetail.difficulty}</span>}
              {libDetail.equipment && <span style={{ fontSize: 10, fontFamily: fonts.body, fontWeight: 700, color: colors.textMuted, background: colors.surfaceHigh, padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase' }}>{libDetail.equipment}</span>}
            </div>
            {libDetail.description && <p style={{ ...bodyStyle, lineHeight: 1.6, marginBottom: 16 }}>{libDetail.description}</p>}
            {libDetail.execution_tips && <p style={{ ...mutedStyle, lineHeight: 1.5, marginBottom: 16 }}>{libDetail.execution_tips}</p>}
            <button onClick={() => { onStartWorkout({ day_name: 'S\u00e9ance libre' }, [{ exercise_name: libDetail.name, muscle_group: libDetail.muscle_group, sets: 3, reps: 10, rest_seconds: 90, video_url: libDetail.video_url, gif_url: libDetail.gif_url }]); setLibDetail(null) }} style={{ ...btnPrimary, width: '100%', padding: '14px 0', fontSize: 13, textAlign: 'center' }}>AJOUTER &Agrave; MA S&Eacute;ANCE</button>
          </div>
        </div>
      )}
      {libShowAll && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: colors.background, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', paddingTop: 'max(16px, env(safe-area-inset-top))', borderBottom: `1px solid ${colors.goldBorder}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button aria-label="Fermer la bibliotheque" onClick={() => setLibShowAll(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={22} color={colors.text} /></button>
            <span style={{ ...titleStyle, fontSize: 16, flex: 1 }}>BIBLIOTH&Egrave;QUE</span>
          </div>
          <div style={{ padding: '12px 20px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color={colors.textDim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={libSearch} onChange={e => setLibSearch(e.target.value)} placeholder="Rechercher..." style={{ width: '100%', background: colors.surface, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 12px 10px 34px', color: colors.text, fontFamily: fonts.body, fontSize: 13, outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '0 20px 8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {['Tous', 'Pectoraux', 'Dos', '\u00c9paules', 'Biceps', 'Triceps', 'Jambes', 'Abdos', 'Fessiers', 'Mollets'].map(m => (
              <button key={m} onClick={() => setLibMuscle(m)} style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', cursor: 'pointer', border: 'none', background: libMuscle === m ? `${colors.goldContainer}33` : colors.goldDim, color: libMuscle === m ? colors.gold : colors.textMuted, ...(libMuscle === m ? { boxShadow: `inset 0 0 0 1px ${colors.goldContainer}66` } : { boxShadow: `inset 0 0 0 1px ${colors.goldBorder}` }) }}>{m}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
            {exercisesCache.filter((e: any) => { if (libMuscle !== 'Tous' && e.muscle_group?.toLowerCase() !== libMuscle.toLowerCase()) return false; if (libSearch && !e.name?.toLowerCase().includes(libSearch.toLowerCase())) return false; return true }).map((ex: any) => (
              <button key={ex.id} onClick={() => { setLibDetail(ex); setLibShowAll(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderBottom: `1px solid ${colors.goldDim}` }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: colors.surfaceHigh, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ex.gif_url ? <img src={ex.gif_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Dumbbell size={20} color={colors.textDim} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: fonts.body }}>{ex.name}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>{ex.muscle_group && <span style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, color: colors.gold, background: colors.goldDim, padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase' }}>{ex.muscle_group}</span>}</div>
                  {ex.equipment && <div style={{ fontSize: 10, color: colors.textDim, fontFamily: fonts.body, marginTop: 2 }}>{ex.equipment}</div>}
                </div>
                <ChevronRight size={16} color={colors.textDim} />
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ padding: '0 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={titleStyle}>ALTERNATIVES</span>
          <div style={titleLineStyle} />
          <ArrowRightLeft size={14} color={colors.gold} style={{ flexShrink: 0 }} />
        </div>
        <div style={{ ...cardStyle, padding: 16 }}>
          <p style={{ ...bodyStyle, marginTop: 0, marginBottom: 12, lineHeight: 1.5 }}>Tu n&apos;as pas la machine ? Trouve un exercice &eacute;quivalent qui cible les m&ecirc;mes muscles.</p>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} color={colors.textDim} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={altSearch} onChange={e => { setAltSearch(e.target.value); setAltSelected(null); setAltResults([]) }} placeholder="Quel exercice veux-tu remplacer ?" style={{ width: '100%', background: colors.background, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: '10px 12px 10px 34px', color: colors.text, fontFamily: fonts.body, fontSize: 13, outline: 'none' }} />
          </div>
          {altSearch.length >= 2 && !altSelected && (
            <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 8, borderRadius: 12, border: `1px solid ${colors.goldBorder}`, background: colors.surface }}>
              {exercisesCache.filter((e: any) => e.name?.toLowerCase().includes(altSearch.toLowerCase())).slice(0, 8).map((ex: any) => (
                <button key={ex.id} onClick={async () => { setAltSelected(ex); setAltSearch(ex.name); const alts = exercisesCache.filter((a: any) => a.id !== ex.id && a.muscle_group?.toLowerCase() === ex.muscle_group?.toLowerCase() && a.name !== ex.name).slice(0, 3); setAltResults(alts) }} style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.goldDim}`, cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, fontFamily: fonts.body }}>{ex.name}</div>
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: fonts.body }}>{ex.muscle_group} &middot; {ex.equipment || 'N/A'}</div>
                </button>
              ))}
            </div>
          )}
          {!altSelected && activeCustomProgram?.days && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {(() => {
                const exNames: string[] = []
                activeCustomProgram.days.forEach((d: any) => { (d.exercises || []).forEach((e: any) => { const n = e.exercise_name || e.name; if (n && !exNames.includes(n)) exNames.push(n) }) })
                return exNames.slice(0, 6).map((n: string) => {
                  const match = exercisesCache.find((e: any) => e.name === n)
                  return (
                    <button key={n} onClick={() => { if (match) { setAltSelected(match); setAltSearch(match.name); const alts = exercisesCache.filter((a: any) => a.id !== match.id && a.muscle_group?.toLowerCase() === match.muscle_group?.toLowerCase() && a.name !== match.name).slice(0, 3); setAltResults(alts) } }} style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', cursor: 'pointer', border: 'none', background: colors.goldDim, color: colors.textMuted, boxShadow: `inset 0 0 0 1px ${colors.goldBorder}` }}>{n}</button>
                  )
                })
              })()}
            </div>
          )}
          {altSelected && altResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {altResults.map((alt: any) => (
                <div key={alt.id} style={{ background: colors.surfaceHigh, border: `1px solid ${colors.goldBorder}`, borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, fontFamily: fonts.body }}>{alt.name}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: 9, fontFamily: fonts.body, fontWeight: 700, color: colors.success, background: 'rgba(74,222,128,0.1)', padding: '1px 6px', borderRadius: 999, textTransform: 'uppercase' }}>M&Ecirc;ME CIBLAGE</span>
                      {alt.equipment && <span style={{ fontSize: 9, fontFamily: fonts.body, color: colors.textDim, background: colors.goldDim, padding: '1px 6px', borderRadius: 999 }}>{alt.equipment}</span>}
                    </div>
                  </div>
                  <button onClick={async () => { if (!activeCustomProgram?.id) return; const updated = activeCustomProgram.days.map((d: any) => ({ ...d, exercises: (d.exercises || []).map((e: any) => { const n = e.exercise_name || e.name; if (n === altSelected.name) return { ...e, exercise_name: alt.name, name: alt.name, muscle_group: alt.muscle_group }; return e }) })); await supabase.from('custom_programs').update({ days: updated }).eq('id', activeCustomProgram.id); onProgramUpdate({ ...activeCustomProgram, days: updated }); setAltSelected(null); setAltSearch(''); setAltResults([]); toast.success(`${altSelected.name} \u2192 ${alt.name}`) }} style={{ ...btnPrimary, padding: '8px 14px', fontSize: 10, flexShrink: 0 }}>REMPLACER</button>
                </div>
              ))}
            </div>
          )}
          {altSelected && altResults.length === 0 && (
            <div style={{ ...mutedStyle, textAlign: 'center', padding: 12, fontStyle: 'italic' }}>Aucune alternative trouv&eacute;e pour ce muscle.</div>
          )}
        </div>
      </div>
    </>
  )
}
